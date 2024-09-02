import { Builder, WebDriver } from "selenium-webdriver";
import * as dotenv from "dotenv";
import BrowserManager from "./browser-manager";
import { LinkedInAuthenticator } from "./linkedin-authenticator";
import { LinkedInJobManager } from "./job-manager";
import { LinkedInBotFacade } from "./linkedin-bot-facade";
import { ConfigError, ConfigValidator } from "./config-validator";
import { ConfigParameters } from "./config.interface";
import { aiAnswerer } from "./aiAnswerer";
import * as fs from "fs";
import { validateResume } from "./utils";
import { LinkedInEasyApplier } from "./easy-applier/linkedin-easy-applier";
import { LoggingService } from "./logging.service";
import { Resume } from "./cv.interface";

dotenv.config({ path: "../.env" });

export class Main {
    private driver?: WebDriver;
    private config?: ConfigParameters;
    private aiAnswerer?: aiAnswerer;
    private cv?: Resume;
    private logger: LoggingService;

    constructor() {
        this.logger = new LoggingService("Main");
    }

    public async initialize() {
        const {
            LINKEDIN_EMAIL,
            LINKEDIN_PASSWORD,
            OLLAMA_BASE_URL,
            CONFIG_FILE_PATH,
            MODEL,
            OPENAI_API_KEY,
            ANTHROPIC_API_KEY,
            TEMPERATURE
        } = process.env;

        if (!LINKEDIN_EMAIL || !LINKEDIN_PASSWORD || !CONFIG_FILE_PATH) {
            this.logger.error(`
                Base Environment variables not set.
                LinkedIn email: ${!!LINKEDIN_EMAIL}
                LinkedIn password: ${!!LINKEDIN_PASSWORD}
                Config file path: ${!!CONFIG_FILE_PATH}
                `);
            BrowserManager.closeUnsignedChromeInstances();
            throw new Error("Missing environment variables");
        }

        this.logger.info("Checking for selected AI provider...");

        let provider;

        if (OPENAI_API_KEY) {
            this.logger.success("OpenAI API key found.");
            this.logger.info("Using OpenAI for AI responses.");
            provider = "openai";
        }

        if (ANTHROPIC_API_KEY) {
            this.logger.success("Anthropic API key found.");
            this.logger.info("Using Anthropic for AI responses.");
            provider = "anthropic";
        }

        if (OLLAMA_BASE_URL) {
            this.logger.success("Ollama base URL found.");
            this.logger.info("Using Ollama for AI responses.");
            provider = "ollama";
        }

        if (!provider) {
            this.logger.error("No AI provider found. Exiting...");
            BrowserManager.closeUnsignedChromeInstances();
            process.exit(1);
        }

        if (!MODEL) {
            this.logger.error("No model specified. Exiting...");
            BrowserManager.closeUnsignedChromeInstances();
            process.exit(1);
        }


        this.loadConfig(CONFIG_FILE_PATH);
        this.loadCV();
        this.initaiAnswerer(provider, MODEL, !Number.isNaN(Number(TEMPERATURE)) ? Number(TEMPERATURE) : 0.2);
        this.setGlobalFields();
        await this.start(LINKEDIN_EMAIL, LINKEDIN_PASSWORD);
        this.setupCleanup();
    }

    private initaiAnswerer(provider: string, model: string, temperature: number) {
        if (!this.cv) {
            throw new Error("CV not loaded.");
        }

        let ai: { model: string; temperature: number; apiKey?: string; baseUrl?: string; };

        const apiKey = provider === "openai" ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY;
        const baseUrl = provider === "ollama" ? process.env.OLLAMA_BASE_URL : undefined;
        const temperatureValue = !Number.isNaN(Number(process.env.TEMPERATURE)) ? Number(process.env.TEMPERATURE) : 0.2;
        const modelValue = process.env.MODEL || undefined;

        if (!modelValue) {
            throw new Error("Model not specified.");
        }

        switch (provider) {
            case "openai":
                this.aiAnswerer = new aiAnswerer({
                    openai: {
                        model: modelValue,
                        temperature: temperatureValue,
                        apiKey: apiKey!
                    }
                });
                break;
            case "anthropic":
                this.aiAnswerer = new aiAnswerer(
                    {
                        anthropic: {
                            model: modelValue,
                            temperature: temperatureValue,
                            apiKey: apiKey!
                        }
                    });
                break;
            case "ollama":
                this.aiAnswerer = new aiAnswerer({
                    ollama: {
                        model: modelValue,
                        temperature: temperatureValue,
                        baseUrl: baseUrl!
                    }
                });
                break;
            default:
                throw new Error("Invalid AI provider.");
        }

        this.aiAnswerer = new aiAnswerer({
            [provider]: {
                model,
                temperature,
                apiKey,
                baseUrl
            }
        });
        this.aiAnswerer.setCV(this.cv);
    }

    private loadCV() {
        if (!this.config?.uploads.cv) {
            throw new Error("CV file path not set in config.");
        }

        const fileContent = fs.readFileSync(this.config.uploads.cv, 'utf8');
        const profileData = JSON.parse(fileContent);

        if (validateResume(profileData)) {
            this.cv = profileData;
            return;
        }

        throw new Error("Invalid resume file.");
    }


    private async initDriver() {
        const options = BrowserManager.chromeBrowserOptions();

        this.driver = await new Builder()
            .forBrowser("chrome")
            .setChromeOptions(options)
            .build();
    }

    private initBot() {
        if (!this.driver) throw new Error("Driver not initialized.");
        if (!this.aiAnswerer) throw new Error("AI answerer not initialized.");
        if (!this.config) throw new Error("Config not loaded.");
        if (!this.cv) throw new Error("CV not loaded.");

        const loginComponent = new LinkedInAuthenticator(this.driver);
        const linkedInEasyApplier = new LinkedInEasyApplier(this.driver, this.aiAnswerer);
        const applyComponent = new LinkedInJobManager(this.driver, this.aiAnswerer!, linkedInEasyApplier);
        return new LinkedInBotFacade(loginComponent, applyComponent);
    }

    private async start(email: string, password: string) {
        try {
            await this.initDriver();
            const bot = this.initBot();
            bot.setJobApplicationProfileAndResume('jobApplicationProfile', 'resume');
            bot.setParameters(this.config);
            await bot.startLogin(email, password);  // Handles logging in
            this.logger.success("Login successful, starting job applications...");
            await bot.startApply();  // Handles applying to jobs
            this.logger.info("Job application process started...");
        } catch (error) {
            this.logger.error(`Error starting bot: ${error}`);
        }
    }

    private setGlobalFields() {
        this.setEnv("RESUME_FILE_PATH", this.config?.uploads.resume || "");
    }

    private setEnv(key: string, value: string) {
        process.env[key] = value;
    }

    private async loadConfig(filepath: string): Promise<any> {
        try {
            const validator = new ConfigValidator();
            this.config = validator.validateConfig(filepath);
        } catch (error) {
            if (error instanceof ConfigError) {
                this.logger.error(`Error loading config: ${error.message}`);
            } else {
                this.logger.error(`Error loading config: ${error}`);
            }
            process.exit(1);
        }
    }

    // Clean up resources
    private setupCleanup() {
        const cleanup = async () => {
            process.exit(0);
        };

        // Handle Ctrl+C (SIGINT)
        process.on('SIGINT', async () => {
            this.logger.info("Caught interrupt signal (SIGINT)");
            await cleanup();
            process.exit(0);
        });

        // Handle terminal close or process exit
        process.on('exit', async () => {
            await cleanup();
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', async (error) => {
            this.logger.error(`Uncaught exception: ${error}`);
            await cleanup();
            process.exit(1);
        });
    }
}