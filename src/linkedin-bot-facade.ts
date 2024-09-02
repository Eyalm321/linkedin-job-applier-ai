import { LinkedInJobManager } from "./job-manager";
import { LinkedInAuthenticator } from "./linkedin-authenticator";
import { LoggingService } from "./logging.service";

class LinkedInBotState {
    credentialsSet: boolean;
    apiKeySet: boolean;
    jobApplicationProfileSet: boolean;
    gptAnswererSet: boolean;
    parametersSet: boolean;
    loggedIn: boolean;


    constructor() {
        this.credentialsSet = false;
        this.apiKeySet = false;
        this.jobApplicationProfileSet = false;
        this.gptAnswererSet = true;
        this.parametersSet = false;
        this.loggedIn = false;
    }

    validateState(requiredKeys: Array<keyof LinkedInBotState>): void {
        for (const key of requiredKeys) {
            if (!this[key]) {
                throw new Error(`${this.formatKey(key)} must be set before proceeding.`);
            }
        }
    }

    private formatKey(key: string): string {
        return key.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, str => str.toUpperCase());
    }
}

export class LinkedInBotFacade {
    private state: LinkedInBotState;
    private jobApplicationProfile: string | null;
    private resume: string | null;
    private email: string | null;
    private password: string | null;
    private parameters: any;
    private loginComponent: LinkedInAuthenticator;
    private applyComponent: LinkedInJobManager;
    private logger: LoggingService;

    constructor(loginComponent: any, applyComponent: any) {
        this.loginComponent = loginComponent;
        this.applyComponent = applyComponent;
        this.state = new LinkedInBotState();
        this.jobApplicationProfile = null;
        this.resume = null;
        this.email = null;
        this.password = null;
        this.parameters = null;
        this.logger = new LoggingService("LinkedInBotState");
    }

    setJobApplicationProfileAndResume(jobApplicationProfile: string, resume: string): void {
        this.validateNonEmpty(jobApplicationProfile, "Job application profile");
        this.validateNonEmpty(resume, "Resume");
        this.jobApplicationProfile = jobApplicationProfile;
        this.resume = resume;
        this.state.jobApplicationProfileSet = true;
    }

    setGptAnswererAndResumeGenerator(gptAnswererComponent: any, resumeGeneratorManager: any): void {
        this.ensureJobProfileAndResumeSet();
        gptAnswererComponent.setJobApplicationProfile(this.jobApplicationProfile);
        gptAnswererComponent.setResume(this.resume);
        this.state.gptAnswererSet = true;
    }

    setParameters(parameters: any): void {
        this.validateNonEmpty(parameters, "Parameters");
        this.parameters = parameters;
        this.applyComponent.setParameters(parameters);
        this.state.parametersSet = true;
    }

    async startLogin(email: string, password: string): Promise<void> {
        if (!email || !password) {
            throw new Error("Email and password must be set before proceeding.");
        }

        this.state.credentialsSet = true;
        await this.loginComponent.start();
        this.state.loggedIn = true;
    }

    async startApply(): Promise<void> {
        this.logger.info("Validating state before applying...");
        this.state.validateState(['loggedIn', 'jobApplicationProfileSet', 'gptAnswererSet', 'parametersSet']);
        this.logger.info("Starting job application process...");
        await this.applyComponent.startApplying();
    }

    private validateNonEmpty(value: any, name: string): void {
        if (!value) {
            throw new Error(`${name} cannot be empty.`);
        }
    }

    private ensureJobProfileAndResumeSet(): void {
        if (!this.state.jobApplicationProfileSet) {
            throw new Error("Job application profile and resume must be set before proceeding.");
        }
    }
}
