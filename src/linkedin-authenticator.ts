import { WebDriver, By, until, WebElement } from 'selenium-webdriver';
import { NoSuchElementError, TimeoutError } from 'selenium-webdriver/lib/error';
import { sleepRandom } from './utils';
import { LoggingService } from './logging.service';

export class LinkedInAuthenticator {
    private driver: WebDriver | undefined;
    private logger: LoggingService;

    constructor(driver?: WebDriver) {
        this.driver = driver;
        this.logger = new LoggingService("LinkedInAuthenticator");
    }

    public async start(): Promise<void> {
        this.logger.info("Starting Chrome browser to log in to LinkedIn.");
        await this.driver?.get('https://www.linkedin.com');
        await this.waitForPageLoad();

        if (!(await this.isLoggedIn())) {
            await this.handleLogin();
        }
    }

    private async handleLogin(): Promise<void> {
        // check if not already in login page
        if (!this.driver
            || !(await this.driver.getCurrentUrl()).includes('linkedin.com/login')
            || !(await this.driver.getCurrentUrl()).includes('linkedin.com/uas/login')) {
            this.logger.info("Navigating to the LinkedIn login page...");
            await this.driver?.get("https://www.linkedin.com/login");
            await this.waitForPageLoad();
        }
        // Check if redirected to /feed instead of /login
        if (this.driver && (await this.driver.getCurrentUrl()).includes("feed")) {
            this.logger.info("Already logged in, redirected to feed. Continuing...");
            return;
        }

        try {
            await this.enterCredentials();
            sleepRandom(700, 1200);
            await this.submitLoginForm();
        } catch (error) {
            if (error instanceof NoSuchElementError) {
                this.logger.error("Could not log in to LinkedIn. Please check your credentials.");
            }
        }

        // Handle potential security check after login
        await this.handleSecurityCheck();
    }

    private async enterCredentials(): Promise<void> {
        try {
            const emailField: WebElement = await this.driver!.wait(until.elementLocated(By.id("username")), 10000);
            await this.typeWithDelay(emailField, process.env.LINKEDIN_EMAIL!);
            sleepRandom(300, 500);
            const passwordField: WebElement = await this.driver!.findElement(By.id("password"));
            await this.typeWithDelay(passwordField, process.env.LINKEDIN_PASSWORD!);
        } catch (error) {
            if (error instanceof TimeoutError) {
                this.logger.error("Login form not found. Aborting login.");
            }
        }
    }

    private async typeWithDelay(element: WebElement, text: string): Promise<void> {
        for (const char of text) {
            await element.sendKeys(char);
            await this.sleep(this.random(50, 150)); // Random delay between 50ms and 150ms
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private random(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }


    private async submitLoginForm(): Promise<void> {
        try {
            const loginButton: WebElement = await this.driver!.findElement(By.xpath('//button[@type="submit"]'));
            await loginButton.click();
            sleepRandom(1000, 2000); // Random delay between 1s and 2s
        } catch (error) {
            if (error instanceof NoSuchElementError) {
                this.logger.error("Login button not found. Please verify the page structure.");
            }
        }
    }

    private async handleSecurityCheck(): Promise<void> {
        try {
            const currentUrl = await this.driver?.getCurrentUrl();

            if (currentUrl && currentUrl.includes('linkedin.com/checkpoint/challenge/')) {
                this.logger.warn("Security checkpoint detected. Please complete the challenge.");
                await this.driver?.wait(until.urlContains('https://www.linkedin.com/feed/'), 300000);
                this.logger.info("Security check completed.");
            } else {
                this.logger.info("No security checkpoint detected.");
            }
        } catch (error) {
            if (error instanceof TimeoutError) {
                this.logger.warn("Security check not completed. Please try again later.");
            } else {
                this.logger.error(`Error handling security check: ${error}`);
            }
        }
    }


    private async isLoggedIn(): Promise<boolean> {
        await this.driver?.get('https://www.linkedin.com/feed');
        await this.waitForPageLoad();
        try {
            await this.driver?.wait(until.elementLocated(By.className('share-box-feed-entry__trigger')), 10000);
            const buttons: WebElement[] = await this.driver?.findElements(By.className('share-box-feed-entry__trigger')) || [];
            if (buttons.some(button => button.getText().then(text => text.trim() === 'Start a post'))) {
                this.logger.info("User is already logged in.");
                return true;
            }
        } catch (error) {
            if (error instanceof TimeoutError) {
                // Continue to login
            }
        }
        return false;
    }

    private async waitForPageLoad(timeout: number = 10000): Promise<void> {
        try {
            await this.driver?.wait(async () => await this.driver!.executeScript('return document.readyState') === 'complete', timeout);
        } catch (error) {
            if (error instanceof TimeoutError) {
                this.logger.error("Page load timed out.");
            }
        }
    }
}
