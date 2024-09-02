import { Builder, ThenableWebDriver } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import * as ps from "ps-node";
import { exec } from "child_process";
import { Options } from "selenium-webdriver/chrome";
import path from "path";
import fs from "fs";
import { LoggingService } from "./logging.service";

let chromeProfilePath: string = path.join(process.cwd(), "chrome_profile", "linkedin_profile");

const BOT_ARG = "--bot";

class BrowserManager {
    private static logger: LoggingService;

    constructor() {
        BrowserManager.logger = new LoggingService("BrowserManager");
    }
    static async closeUnsignedChromeInstances(): Promise<void> {
        return new Promise((resolve, reject) => {
            ps.lookup({ command: "chrome" }, (err: any, resultList: any[]) => {
                if (err) {
                    return reject(`Failed to lookup Chrome processes: ${err}`);
                }

                resultList.forEach(async (process: { arguments: string | string[]; pid: any; }) => {
                    if (process && process.arguments.includes("--bot")) {
                        await this.logger.info(`Terminating unsigned or headless Chrome process with PID ${process.pid}...`);
                        ps.kill(process.pid, async (killErr: any) => {
                            if (killErr) {
                                await this.logger.error(`Failed to terminate process ${process.pid}: ${killErr}`);
                                exec(`kill -9 ${process.pid}`); // Force kill if necessary
                            } else {
                                await this.logger.success(`Chrome process with PID ${process.pid} terminated successfully.`);
                            }
                        });
                    }
                });

                resolve();
            });
        });
    }

    public static async initBrowser(): Promise<ThenableWebDriver> {
        try {
            await this.closeUnsignedChromeInstances();

            const options = this.chromeBrowserOptions();
            const service = new chrome.ServiceBuilder().build();
            const browser = chrome.Driver.createSession(options, service);

            return browser;
        } catch (error) {
            throw new Error(`Failed to initialize browser: ${error}`);
        }
    }


    private static ensureChromeProfile(): string {
        const profileDir = path.dirname(chromeProfilePath);

        // Check if the directory exists, if not, create it
        if (!fs.existsSync(profileDir)) {
            fs.mkdirSync(profileDir, { recursive: true });
        }

        // Check if the profile path itself exists, if not, create it
        if (!fs.existsSync(chromeProfilePath)) {
            fs.mkdirSync(chromeProfilePath, { recursive: true });
        }

        return chromeProfilePath;
    }


    public static chromeBrowserOptions(): Options {
        // Assuming you have a function `ensureChromeProfile` that needs to be executed
        this.ensureChromeProfile();

        const options = new Options();

        // Translate Chrome options from Python to TypeScript
        options.addArguments(BOT_ARG);
        options.addArguments("--no-sandbox");  // Disable sandboxing for improved performance
        options.addArguments("--disable-dev-shm-usage");  // Use a temporary directory for shared memory
        options.addArguments("--ignore-certificate-errors");  // Ignore SSL certificate errors
        options.addArguments("--disable-extensions");  // Disable browser extensions
        options.addArguments("--disable-gpu");  // Disable GPU acceleration
        options.addArguments("window-size=1200x800");  // Set the browser window size
        options.addArguments("--disable-background-timer-throttling");  // Disable background timer throttling
        options.addArguments("--disable-backgrounding-occluded-windows");  // Disable suspending occluded windows
        options.addArguments("--disable-translate");  // Disable automatic translation
        options.addArguments("--disable-popup-blocking");  // Disable popup blocking
        options.addArguments("--no-first-run");  // Disable initial browser configuration
        options.addArguments("--no-default-browser-check");  // Disable default browser check
        options.addArguments("--disable-logging");  // Disable logging
        options.addArguments("--disable-autofill");  // Disable form autofill
        options.addArguments("--disable-plugins");  // Disable browser plugins
        options.addArguments("--disable-animations");  // Disable animations
        options.addArguments("--disable-cache");  // Disable cache
        options.setLoggingPrefs({ browser: "OFF" });  // Set logging preferences
        options.excludeSwitches("enable-automation", "enable-logging");  // Exclude automation and logging switches


        // Preferences for content settings
        const prefs = {
            "profile.default_content_setting_values.images": 2,  // Disable image loading
            "profile.managed_default_content_settings.stylesheets": 2,  // Disable stylesheet loading
        };
        options.setUserPreferences(prefs);

        // Profile management
        if (chromeProfilePath && chromeProfilePath.length > 0) {
            const initialPath = path.dirname(chromeProfilePath);
            const profileDir = path.basename(chromeProfilePath);
            options.addArguments(`--user-data-dir=${initialPath}`);
            options.addArguments(`--profile-directory=${profileDir}`);
        } else {
            options.addArguments("--incognito");
        }

        return options;
    }
}

export default BrowserManager;
