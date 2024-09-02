import fs from 'fs';
import path from 'path';
import { WebDriver, By, WebElement, until } from 'selenium-webdriver';
import { NoSuchElementError } from 'selenium-webdriver/lib/error';
import { random, shuffle } from 'lodash';
import * as utils from './utils';
import { ConfigParameters, DateFilters } from './config.interface';
import { aiAnswerer } from './aiAnswerer';
import { LinkedInEasyApplier } from './easy-applier/linkedin-easy-applier';
import { Job } from './job';
import { LoggingService } from './logging.service';


class EnvironmentKeys {
    skipApply: boolean;
    disableDescriptionFilter: boolean;

    constructor() {
        this.skipApply = this._readEnvKeyBool('SKIP_APPLY');
        this.disableDescriptionFilter = this._readEnvKeyBool('DISABLE_DESCRIPTION_FILTER');
    }

    private _readEnvKey(key: string): string {
        return process.env[key] || '';
    }

    private _readEnvKeyBool(key: string): boolean {
        return process.env[key] === 'True';
    }
}

class LinkedInJobManager {
    private driver: WebDriver;
    private setOldAnswers: [string, string, string][] = [];
    private linkedInEasyApplier: LinkedInEasyApplier | null = null;
    private aiAnswerer: aiAnswerer;
    private companyBlacklist: string[] = [];
    private titleBlacklist: string[] = [];
    private positions: string[] = [];
    private locations: string[] = [];
    private baseSearchUrl: string = '';
    private seenJobs: string[] = [];
    private resumePath: string | null = null;
    private outputFileDirectory: string = '';
    private envConfig: EnvironmentKeys;
    private logger: LoggingService;

    constructor(driver: WebDriver, aiAnswerer: aiAnswerer, linkedInEasyApplier: LinkedInEasyApplier) {
        this.driver = driver;
        this.setOldAnswers = [];
        this.envConfig = new EnvironmentKeys();
        this.aiAnswerer = aiAnswerer;
        this.linkedInEasyApplier = linkedInEasyApplier;
        this.logger = new LoggingService("LinkedInJobManager");
    }

    setParameters(parameters: ConfigParameters) {
        this.companyBlacklist = parameters.companyBlacklist || [];
        this.titleBlacklist = parameters.titleBlacklist || [];
        this.positions = parameters.positions || [];
        this.locations = parameters.locations || [];
        this.baseSearchUrl = this.getBaseSearchUrl(parameters);

        const resumePath = parameters.uploads?.resume;
        if (resumePath && fs.existsSync(resumePath)) {
            this.resumePath = path.resolve(resumePath);
        }

        this.outputFileDirectory = parameters.outputFileDirectory;
    }

    async startApplying() {
        const searches = shuffle(this.positions.flatMap(position => this.locations.map(location => ({ position, location }))));
        let pageSleep = 0;
        const minimumTime = 60 * 15;
        let minimumPageTime = Date.now() + minimumTime * 1000;

        this.logger.info("Starting the job application process...");
        for (const { position, location } of searches) {
            const locationUrl = `&location=${location}`;
            let jobPageNumber = -1;
            this.logger.info(`Starting the search for ${position} in ${location}.`);

            try {
                while (true) {
                    pageSleep += 1;
                    jobPageNumber += 1;
                    this.logger.info(`Navigating to job page ${jobPageNumber} for position ${position} in ${location}.`);
                    await utils.sleepRandom(2000, 3000);
                    await this.nextJobPage(position, locationUrl, jobPageNumber);
                    this.logger.info(`Page ${jobPageNumber} loaded. Waiting for a random delay before starting the application process.`);
                    await utils.sleepRandom(2000, 3000);

                    this.logger.info("Starting the application process for jobs on this page...");
                    await this.applyJobs();
                    this.logger.info("Job applications for this page have been completed successfully!");

                    const timeLeft = minimumPageTime - Date.now();
                    if (timeLeft > 0) {
                        this.logger.warn(`Minimum time not reached. Sleeping for ${timeLeft / 1000} seconds before proceeding.`);
                        await utils.sleep(timeLeft);
                        minimumPageTime = Date.now() + minimumTime * 1000;
                    } else {
                        this.logger.info("Minimum time reached. Continuing to the next job page.");
                    }

                    if (pageSleep % 5 === 0) {
                        const sleepTime = random(5000, 34000);
                        this.logger.warn(`Taking a longer break. Sleeping for ${sleepTime / 1000} seconds (${sleepTime / 60000} minutes).`);
                        await utils.sleep(sleepTime);
                        pageSleep += 1;
                    }
                }
            } catch (e: any) {
                this.logger.error(`An error occurred while applying for jobs on page ${jobPageNumber} for position ${position} in ${location}. Error: ${e.message}`);
                console.error(e);
            }
        }
        this.logger.success("Job application process completed for all searches.");
    }


    private async applyJobs() {
        if (!this.linkedInEasyApplier) {
            throw new Error("LinkedInEasyApplier not set.");
        }

        try {
            this.logger.debug("Checking if the page has any jobs to apply for...");
            const noJobsElement = await this.driver.findElement(By.className('jobs-search-two-pane__no-results-banner--expand'));
            this.logger.debug("No jobs element found. Checking if the page has any jobs to apply for...");
            const pageSource = await this.driver.getPageSource();
            if (noJobsElement && (await noJobsElement.getText()).includes('No matching jobs found') || pageSource.toLowerCase().includes("unfortunately, things aren")) {
                throw new Error("No more jobs on this page");
            }
        } catch (e) {
            if (!(e instanceof NoSuchElementError)) {
                this.logger.error(`Error checking for jobs on page: ${e}`);
            }
        }

        const jobResults = await this.driver.findElement(By.className('jobs-search-results-list'));
        await utils.scrollSlow({
            driver: this.driver,
            scrollableElement: jobResults,
            start: 0,
            end: 3600,
            step: 100,
            reverse: false
        });
        await utils.sleepRandom(1000, 2000);
        await utils.scrollSlow({
            driver: this.driver,
            scrollableElement: jobResults,
            start: 0,
            end: 3600,
            step: 300,
            reverse: true
        });

        const scaffoldLayoutListContainer = await this.driver.findElements(By.className('scaffold-layout__list-container'));
        const jobListElements = await scaffoldLayoutListContainer[0].findElements(By.className('jobs-search-results__list-item'));
        if (!jobListElements.length) {
            throw new Error("No job class elements found on page");
        }

        const jobList = await Promise.all(jobListElements.map(jobElement => this.extractJobInformationFromTile(jobElement)));
        for (const job of jobList) {
            if (this.isBlacklisted(job.title, job.company, job.link)) {
                this.logger.info(`Blacklisted ${job.title} at ${job.company}, skipping...`);
                this.writeToFile(job, "skipped");
                continue;
            }
            try {
                if (!["Continue", "Applied", "Apply"].includes(job.apply_method)) {
                    await this.linkedInEasyApplier.jobApply(job);
                    this.writeToFile(job, "success");
                }
            } catch (e) {
                console.error(e);
                this.writeToFile(job, "failed");
            }
        }
    }

    private writeToFile(job: Job, fileName: string) {
        const pdfPath = path.resolve(job.pdf_path);
        const data = {
            company: job.company,
            job_title: job.title,
            link: job.link,
            job_recruiter: job.recruiter_link,
            job_location: job.location,
            pdf_path: pdfPath
        };
        const filePath = path.join(this.outputFileDirectory, `${fileName}.json`);

        let existingData: any[] = [];
        if (fs.existsSync(filePath)) {
            try {
                existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            } catch (e) {
                existingData = [];
            }
        }

        existingData.push(data);
        fs.writeFileSync(filePath, JSON.stringify(existingData, null, 4000));
    }

    private getBaseSearchUrl(parameters: ConfigParameters): string {
        const urlParts: string[] = [];
        if (parameters.remote) {
            urlParts.push("f_CF=f_WRA");
        }
        const experienceLevels = Object.entries(parameters.experienceLevel || {}).filter(([_, v]) => v).map(([k], i) => (i + 1).toString());
        if (experienceLevels.length) {
            urlParts.push(`f_E=${experienceLevels.join(',')}`);
        }
        urlParts.push(`distance=${parameters.distance}`);
        const jobTypes = Object.entries(parameters.jobTypes || {}).filter(([_, v]) => v).map(([k]) => k.charAt(0).toUpperCase());
        if (jobTypes.length) {
            urlParts.push(`f_JT=${jobTypes.join(',')}`);
        }
        const dateMapping: Record<string, string> = {
            "all time": "",
            "month": "&f_TPR=r2592000",
            "week": "&f_TPR=r604800",
            "24 hours": "&f_TPR=r86400"
        };
        const dateParam = Object.entries(dateMapping).find(
            ([k]) => parameters.date?.[k as keyof DateFilters]
        )?.[1] || "";
        urlParts.push("f_LF=f_AL");  // Easy Apply
        return `?${urlParts.join('&')}${dateParam}`;
    }

    private async nextJobPage(position: string, location: string, jobPage: number) {
        const baseUrl = `https://www.linkedin.com/jobs/search/${this.baseSearchUrl}&keywords=${encodeURIComponent(position)}&location=${encodeURIComponent(location)}&start=${jobPage * 25}`;
        this.logger.info(`Navigating to job page ${jobPage} for position ${position} in ${location}.`);

        const maxRetries = 3;
        let delay = 2000; // Start with a 2 second delay

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.driver.get(baseUrl);

                // Wait for URL to contain key elements (partial match)
                await this.driver.wait(until.urlContains('/jobs/search/'), 15000);

                // Wait for key elements to be present
                await this.driver.wait(until.elementLocated(By.className('jobs-search-results-list')), 15000);

                // Additional check: wait for job listings to be present
                await this.driver.wait(until.elementsLocated(By.className('job-card-container')), 15000);

                this.logger.info(`Successfully navigated to job page ${jobPage} for position ${position} in ${location}.`);
                return;
            } catch (error: any) {
                this.logger.warn(`Attempt ${attempt} failed to navigate to job page ${jobPage}: ${error.message}`);
                if (attempt === maxRetries) {
                    throw new Error(`Failed to navigate to job page ${jobPage} after ${maxRetries} attempts.`);
                }
                // Exponential backoff
                await utils.sleep(delay);
                delay *= 2; // Double the delay for the next attempt
            }
        }
    }

    private async extractJobInformationFromTile(jobTile: WebElement): Promise<Job> {
        let jobTitle = '', company = '', jobLocation = '', applyMethod = 'Applied', link = '';
        try {
            jobTitle = await jobTile.findElement(By.className('job-card-list__title')).getText();
            link = (await jobTile.findElement(By.className('job-card-list__title')).getAttribute('href')).split('?')[0];
            company = await jobTile.findElement(By.className('job-card-container__primary-description')).getText();
        } catch { }
        try {
            jobLocation = await jobTile.findElement(By.className('job-card-container__metadata-item')).getText();
        } catch { }
        try {
            applyMethod = await jobTile.findElement(By.className('job-card-container__apply-method')).getText();
        } catch { }

        return new Job(jobTitle, company, jobLocation, link, applyMethod);
    }

    private isBlacklisted(jobTitle: string, company: string, link: string): boolean {
        const jobTitleWords = jobTitle.toLowerCase().split(' ');
        const titleBlacklisted = this.titleBlacklist.some(word => jobTitleWords.includes(word.toLowerCase()));
        const companyBlacklisted = this.companyBlacklist.map(c => c.toLowerCase()).includes(company.toLowerCase().trim());
        const linkSeen = this.seenJobs.includes(link);
        return titleBlacklisted || companyBlacklisted || linkSeen;
    }
}

export { LinkedInJobManager, EnvironmentKeys };
