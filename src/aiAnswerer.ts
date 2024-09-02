import { AIMessage, AIMessageChunk } from "@langchain/core/messages";
import { Job } from "./job";
import { ChatPromptTemplate, ParamsFromFString } from "@langchain/core/prompts";

import { Templates } from "./templates";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { dedent } from 'ts-dedent';
import { extractNumberFromString, findContent, formatExperienceDetails, formatResume, formatSkills, toSnakeCase } from "./utils";
import Levenshtein from '@designbycode/levenshtein';
import _ from 'lodash';
import { Runnable, RunnableConfig } from "@langchain/core/runnables";
import { LoggingService } from "./logging.service";
import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ExperienceDetail, Resume } from "./cv.interface";


export class aiAnswerer {
    private ai?: ChatOllama | ChatOpenAI | ChatAnthropic;
    private cv?: Resume;
    private logger: LoggingService;

    constructor(provider: {
        openai?: {
            apiKey: string,
            model: string,
            temperature: number;
        },
        anthropic?: {
            apiKey: string,
            model: string,
            temperature: number;
        },
        ollama?: {
            baseUrl: string,
            model: string,
            temperature: number;
        };
    }) {
        this.logger = new LoggingService("aiAnswerer");
        if (provider.ollama) {
            this.ai = new ChatOllama({
                baseUrl: process.env.OLLAMA_BASE_URL,
                model: provider.ollama.model,
                temperature: provider.ollama.temperature,
                streaming: false
            });
        }
        if (provider.openai) {
            this.ai = new ChatOpenAI({
                apiKey: provider.openai.apiKey,
                model: provider.openai.model,
                temperature: provider.openai.temperature
            });
        }
        if (provider.anthropic) {
            this.ai = new ChatAnthropic({
                apiKey: provider.anthropic.apiKey,
                model: provider.anthropic.model,
                temperature: provider.anthropic.temperature
            });
        }
        this.logger.debug(`${provider.ollama ? "Ollama" : provider.openai ? "OpenAI" : provider.anthropic ? "Anthropic" : "No provider"} initialized.`);
        this.logger.debug(`Base URL: ${provider.ollama?.baseUrl}, Model: ${provider.ollama?.model}, Temperature: ${provider.ollama?.temperature}`);
    }

    setCV(cv: Resume): void {
        this.cv = cv;
    }

    async resumeOrCover(phrase: string): Promise<string> {
        if (!this.ai) throw new Error("ai not initialized.");

        const promptTemplate = `
        Given the following phrase, respond with only 'resume' if the phrase is about a resume, or 'cover' if it's about a cover letter. Do not provide any additional information or explanations.
    
        phrase: {phrase}
        `;

        this.logger.debug(`resumeOrCover - Invoking with phrase: ${phrase}`);

        const prompt = ChatPromptTemplate.fromTemplate(promptTemplate);
        const chain = prompt.pipe(this.ai);
        const response: AIMessageChunk = await chain.invoke({ phrase });
        const content = findContent(response);

        if (content && content.includes("resume")) {
            return "resume";
        } else if (content && content.includes("cover")) {
            return "cover";
        } else {
            return "resume";
        }
    }

    createChain(template: keyof Templates): Runnable<ParamsFromFString<string>, AIMessageChunk, RunnableConfig> {
        if (!this.ai) {
            throw new Error("ai not initialized.");
        }

        const templates = new Templates();
        const resumeSectionKey = toSnakeCase(template) as keyof Resume;
        // console.debug(`createChain - Creating chain for template: ${template}, resume section key: ${resumeSectionKey}`);
        const templateStr = this.formatResumeSection(resumeSectionKey, templates[template]);

        return ChatPromptTemplate.fromTemplate(templateStr).pipe(this.ai);
    }

    async answerQuestionTextualWideRange(question: string, description: string | string[]): Promise<string> {
        this.ensureInitialization();
        // console.debug(`answerQuestionTextualWideRange - Invoking with question: ${question}`);

        const descriptionStr = this.formatDescription(description);
        const sectionName = await this.determineSectionName(question);
        this.logger.debug(`answerQuestionTextualWideRange - Determined section: ${sectionName}`);
        if (sectionName === "cover_letter") {
            return this.handleCoverLetterChain(question, descriptionStr);
        }

        return this.handleStandardChain(sectionName, question);
    }

    private ensureInitialization(): void {
        if (!this.ai) {
            throw new Error("ai not initialized.");
        }
        if (!this.cv) {
            throw new Error("CV not set.");
        }
    }

    private formatDescription(description: string | string[]): string {
        return Array.isArray(description) ? description.join("\n") : description;
    }

    private async determineSectionName(question: string): Promise<string> {
        if (!this.ai) throw new Error("ai not initialized.");
        const templates = new Templates();
        const sectionPrompt = templates.getSectionTemplate(question);
        const prompt = ChatPromptTemplate.fromTemplate(sectionPrompt)
            .pipe(this.ai)
            .pipe(new StringOutputParser());

        const sectionOutput = await prompt.invoke({ question });
        const comparableOutput = sectionOutput.toLowerCase().replace(" ", "_");
        this.logger.debug(`answerQuestionTextualWideRange - Determined section: ${comparableOutput}`);
        return comparableOutput;
    }

    private async handleCoverLetterChain(question: string, descriptionStr: string): Promise<string> {
        if (!this.cv) throw new Error("CV not set.");
        // console.debug(`answerQuestionTextualWideRange - Invoking cover letter chain with question: ${question}`);
        const chains = this.initializeChains();
        const coverLetterChain = chains["cover_letter"];
        const coverLetterOutput = await coverLetterChain.invoke({
            resume_section: formatResume(this.cv),
            job_description: descriptionStr
        });
        const outputStr = findContent(coverLetterOutput);
        this.logger.debug(`answerQuestionTextualWideRange - Cover letter output: ${outputStr}`);
        return outputStr || "";
    }

    private async handleStandardChain(sectionName: string, question: string): Promise<string> {
        if (!this.cv) throw new Error("CV not set.");

        // Log the key names from the CV
        // console.debug("handleStandardChain - CV keys:", Object.keys(this.cv));
        const sectionNameKey = sectionName.trim().toLocaleLowerCase().replace(" ", "_") as keyof Resume;
        this.logger.debug(`handleStandardChain - Invoking chain for section '${sectionName}' with question: ${question}`);
        const chains = this.initializeChains();
        const resumeSection = this.cv[sectionNameKey];
        if (!resumeSection) {
            throw new Error(`Section '${sectionName}' not found in either resume or job application profile.`);
        }

        const chain = chains[sectionNameKey];
        if (!chain) {
            throw new Error(`Chain not defined for section '${sectionName}'`);
        }

        const resumeSectionStr = this.formatResumeSection(sectionNameKey, resumeSection);
        const resumeSkillsStr = formatSkills(this.cv.skills);
        // console.debug(`answerQuestionTextualWideRange - Invoking chain for section '${sectionName}' with question: ${question}, resume section: ${resumeSectionStr}, resume skills: ${resumeSkillsStr}`);
        const output = await chain.invoke({ resume_section: resumeSectionStr, skills: resumeSkillsStr, question }) as AIMessage;
        const outputText = findContent(output);

        this.logger.debug(`answerQuestionTextualWideRange - Final output: ${outputText}`);
        return outputText || "";
    }


    private initializeChains(): Record<string, any> {
        return {
            "personal_information": this.createChain('personalInformationTemplate'),
            "self_identification": this.createChain('selfIdentificationTemplate'),
            "legal_authorization": this.createChain('legalAuthorizationTemplate'),
            "work_preferences": this.createChain('workPreferencesTemplate'),
            "education_details": this.createChain('educationDetailsTemplate'),
            "experience_details": this.createChain('experienceDetailsTemplate'),
            "projects": this.createChain('projectsTemplate'),
            "availability": this.createChain('availabilityTemplate'),
            "salary_expectations": this.createChain('salaryExpectationsTemplate'),
            "certifications": this.createChain('certificationsTemplate'),
            "languages": this.createChain('languagesTemplate'),
            "interests": this.createChain('interestsTemplate'),
            "cover_letter": this.createChain('coverLetterTemplate'),
        };
    }

    private formatResumeSection(sectionName: keyof Resume, resumeSection: any): string {
        if (sectionName === "experience_details") {
            return formatExperienceDetails(resumeSection as ExperienceDetail[]);
        }
        return String(resumeSection);
    }


    private preprocessTemplateString(template: string): string {
        return dedent(template);
    }

    public async answerQuestionNumeric(question: string, defaultExperience: number = 3): Promise<number> {
        if (!this.ai) throw new Error("ai not initialized.");
        if (!this.cv) throw new Error("CV not set.");

        this.logger.debug(`answerQuestionNumeric - Invoking with question: ${question}`);

        const funcTemplate = this.preprocessTemplateString('Your numeric question template string here');
        const prompt = ChatPromptTemplate.fromTemplate(funcTemplate);

        const chain = prompt
            .pipe(this.ai)
            .pipe(new StringOutputParser());

        try {
            const outputStr: string = await chain.invoke({
                resume_educations: this.cv.education_details.join("\n"),
                resume_jobs: this.cv.experience_details.join("\n"),
                resume_projects: this.cv.projects.join("\n"),
                question
            }).then(async (outputStr: string) => {
                this.logger.debug(`answerQuestionNumeric - Output string: ${outputStr}`);
                return outputStr;
            });


            const output = extractNumberFromString(outputStr);
            this.logger.debug(`answerQuestionNumeric - Extracted number: ${output}`);
            return output;

        } catch (error) {
            this.logger.error(`answerQuestionNumeric - Error parsing number from response: ${error}`);
            return defaultExperience;
        }
    }

    public async answerQuestionDate(question: string): Promise<Date | null> {
        if (!this.ai) throw new Error("ai not initialized.");
        if (!this.cv) throw new Error("CV not set.");

        this.logger.debug(`answerQuestionDate - Invoking with question: ${question}`);

        const dateTemplate = this.preprocessTemplateString(`
            Given the following question, respond with the most relevant date from the resume.
            
            Question: {question}
        `);

        const prompt = ChatPromptTemplate.fromTemplate(dateTemplate);

        const chain = prompt
            .pipe(this.ai)
            .pipe(new StringOutputParser());

        try {
            const outputDate: Date = await chain.invoke({
                resume_educations: this.cv.education_details.join("\n"),
                resume_jobs: this.cv.experience_details.join("\n"),
                resume_projects: this.cv.projects.join("\n"),
                question
            }).then(async (outputStr: string) => {
                this.logger.debug(`answerQuestionDate - Output string: ${outputStr}`);
                return new Date(outputStr);
            });

            this.logger.debug(`answerQuestionDate - Output date: ${outputDate}`);
            return outputDate;

        } catch (error) {
            this.logger.error(`answerQuestionDate - Error parsing date from response: ${error}`);
            return null;
        }
    }

    public async answerQuestionFromOptions(question: string, options: string[]): Promise<string> {
        try {
            if (!this.ai) throw new Error("AI not initialized.");
            if (!this.cv) throw new Error("CV not set.");

            this.logger.debug(`answerQuestionFromOptions - Invoking with question: ${question} and options: ${options.join(", ")}`);

            const templates = new Templates();
            const funcTemplate = this.preprocessTemplateString(templates.optionsTemplate);
            const prompt = ChatPromptTemplate.fromTemplate(funcTemplate);
            const chain = prompt
                .pipe(this.ai)
                .pipe(new StringOutputParser());

            const outputStr = await chain.invoke({
                resume: formatResume(this.cv),
                question,
                options: options.join("\n")
            }).then(async (outputStr: string) => {
                this.logger.debug(`answerQuestionFromOptions - Output string: ${outputStr}`);
                return outputStr;
            }).catch((error: any) => {
                this.logger.error(`answerQuestionFromOptions - Error during chain invocation: ${error.message}`);
                throw error;
            });

            const bestOption = aiAnswerer.findBestMatch(outputStr, options);
            this.logger.debug(`answerQuestionFromOptions - Best option: ${bestOption}`);
            return bestOption;

        } catch (error: any) {
            this.logger.error(`answerQuestionFromOptions - Error: ${error.message}`);
            throw error;
        }
    }


    public static findBestMatch(text: string, options: string[]): string {
        return _.minBy(options, option => Levenshtein.calculate(text.toLowerCase(), option.toLowerCase())) || options[0];
    }
}
