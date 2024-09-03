import { WebDriver, By, until } from 'selenium-webdriver';
import { scrollSlow, sleepRandom } from '../utils';
import { LoggingService } from '../logging.service';

class JobDetailExtractor {
    private driver: WebDriver;
    private logger: LoggingService;
    constructor(driver: WebDriver) {
        this.driver = driver;
        this.logger = new LoggingService("JobDetailExtractor");
    }

    /**
     * Extracts the job description from the job posting page.
     * 
     * @returns A promise that resolves to the job description as a string.
     */
    public async extractJobDescription(): Promise<string> {
        try {
            await sleepRandom(2000, 3000);
            const seeMoreButton = await this.driver.findElement(
                By.xpath('//button[@aria-label="Click to see more description" and @aria-expanded="false" and contains(@class, "jobs-description__footer-button")]')
            );

            await seeMoreButton.click();
            await sleepRandom(500, 1000);
            await this.scrollPage();
            const descriptionElement = await this.driver.findElement(By.className('jobs-description-content__text'));

            return await descriptionElement.getAttribute('innerHTML');
        } catch (e) {
            console.error("Job description 'See more' button not found or unable to click:", e);
            throw e;
        }
    }

    /**
     * Extracts the recruiter's LinkedIn profile link from the job posting page.
     * 
     * @returns A promise that resolves to the recruiter's LinkedIn profile link as a string.
     */
    public async extractJobRecruiter(): Promise<string> {
        try {
            const hiringTeamSection = await this.driver.wait(
                until.elementLocated(By.xpath('//h2[text()="Meet the hiring team"]')),
                10000
            );
            const recruiterElement = await hiringTeamSection.findElement(By.xpath('.//following::a[contains(@href, "linkedin.com/in/")]'));
            return await recruiterElement.getAttribute('href');
        } catch (e) {
            this.logger.warn(`Recruiter's profile not found: ${e}, skipping saving recruiter's profile.`);
            return "";
        }
    }

    /**
     * Scrolls the page to ensure that elements are loaded and visible.
     * 
     * @returns A promise that resolves when the scrolling is complete.
     */
    private async scrollPage(): Promise<void> {
        const scrollableElement = await this.driver.findElement(By.css('html'));
        await scrollSlow({
            driver: this.driver,
            scrollableElement,
            step: 300,
            reverse: false,
            start: 0,
            end: 7200
        });
        await sleepRandom(1000, 2000);
        await scrollSlow({
            driver: this.driver,
            scrollableElement,
            step: 300,
            reverse: true,
            start: 0,
            end: 7200
        });
        await sleepRandom(1000, 2000);
    }
}

export { JobDetailExtractor };
