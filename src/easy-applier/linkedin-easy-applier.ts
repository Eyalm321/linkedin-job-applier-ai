import { By, until, WebDriver, WebElement } from 'selenium-webdriver';
import { Job } from '../job';
import fs from 'fs';
import { scrollPage, sleepRandom } from '../utils';
import { aiAnswerer } from '../aiAnswerer';
import { ApplicationFormFiller } from './application-form-filler';
import { JobDetailExtractor } from './job-detail-extractor';
import { PDFGenerator } from './pdf-generator';
import { QuestionManager } from './questions-manager';

class LinkedInEasyApplier {
    private driver: WebDriver;
    private jobDetailExtractor: JobDetailExtractor;
    private formFiller: ApplicationFormFiller;
    private pdfGenerator: PDFGenerator;
    private aiAnswerer: aiAnswerer;

    constructor(driver: WebDriver, aiAnswerer: aiAnswerer) {
        this.driver = driver;
        this.aiAnswerer = aiAnswerer;
        const questionManager = new QuestionManager(aiAnswerer);
        this.jobDetailExtractor = new JobDetailExtractor(driver);
        this.formFiller = new ApplicationFormFiller(driver, questionManager);
        const resumePath = process.env.RESUME_PATH ? this.validateResumePath(process.env.RESUME_PATH) : null;
        this.pdfGenerator = new PDFGenerator(resumePath);
    }

    /**
     * Initiates the job application process for a given job.
     * 
     * @param job The job to apply for.
     */
    public async jobApply(job: Job): Promise<void> {
        try {
            await this.driver.get(job.link);
            sleepRandom(1500, 2500);

            // Verify that the navigation was successful
            const currentUrl = await this.driver.getCurrentUrl();
            if (currentUrl !== job.link) {
                throw new Error(`Failed to navigate to the job link. Expected ${job.link}, but got ${currentUrl}`);
            }
            await this.setJob(job);

            const easyApplyButton = await this.findEasyApplyButton();
            await easyApplyButton.click();
            sleepRandom(2000, 3000);
            await this.formFiller.fillApplicationForm(job);
        } catch (e) {
            console.error("Failed to apply to job!", e);
            await this.discardApplication();
            throw e;
        }
    }

    private async findEasyApplyButton(): Promise<WebElement> {
        return this.retry(async () => {
            const buttons = await this.driver.wait(
                until.elementsLocated(By.xpath('//button[contains(@class, "jobs-apply-button") and contains(., "Easy Apply")]')),
                10000
            ) as unknown as WebElement[];

            for (const button of buttons) {
                if (await button.isDisplayed() && await button.isEnabled()) {
                    await this.scrollIntoView(button);
                    return button;
                }
            }
            throw new Error("No clickable 'Easy Apply' button found");
        }, 3, async () => {
            console.log("Refreshing the page...");
            await this.driver.navigate().refresh();
            await sleepRandom(4000, 6000);
        });
    }


    private async retry<T>(fn: () => Promise<T>, retries: number, onRetry: () => Promise<void>): Promise<T> {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                return await fn();
            } catch (e) {
                if (attempt < retries - 1) {
                    console.log(`Attempt ${attempt + 1} failed, retrying...`);
                    await onRetry();
                } else {
                    throw e;
                }
            }
        }
        throw new Error("Failed after multiple retries");
    }

    private async scrollIntoView(element: WebElement): Promise<void> {
        await this.driver.executeScript("arguments[0].scrollIntoView({block: 'center', inline: 'nearest'});", element);
    }



    /**
     * Sets the job details in the various components used in the application process.
     * 
     * @param job The job to set.
     */
    private async setJob(job: Job): Promise<void> {
        job.setJobDescription(await this.jobDetailExtractor.extractJobDescription());
        job.setRecruiterLink(await this.jobDetailExtractor.extractJobRecruiter());
    }

    /**
     * Validates the given resume path. If the path is invalid or doesn't exist, it returns null.
     * 
     * @param resumePath The path to the resume file.
     * @returns The valid resume path or null if invalid.
     */
    private validateResumePath(resumePath: string | null): string | null {
        return resumePath && fs.existsSync(resumePath) ? resumePath : null;
    }

    /**
     * Discards the current job application by clicking the necessary buttons to exit.
     */
    private async discardApplication(): Promise<void> {
        try {
            const dismissButton = await this.driver.findElement(By.className('artdeco-modal__dismiss'));
            await sleepRandom(1500, 2500);
            await dismissButton.click();
            const confirmButton = await this.driver.findElement(By.className('artdeco-modal__confirm-dialog-btn'));
            await sleepRandom(1500, 2500);
            await confirmButton.click();
        } catch (e) {
            console.error("Error discarding application:", e);
        }
    }
}

export { LinkedInEasyApplier };
