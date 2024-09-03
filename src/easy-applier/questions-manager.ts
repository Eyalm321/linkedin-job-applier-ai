import fs from 'fs';
import { aiAnswerer } from '../aiAnswerer';
import { PersonalInformation, Resume } from '../cv.interface';
import { Job } from '../job';

class QuestionManager {
    private aiAnswerer: aiAnswerer;
    private outputFile: string = 'answers.json';
    private questions: Array<any> = [];
    private cvData: Resume | null = null;
    private job?: Job;

    constructor(aiAnswerer: aiAnswerer) {
        this.aiAnswerer = aiAnswerer;
        this.questions = this.loadQuestionsFromJson();
        this.loadCVData();
    }

    /**
     * Sets the current job for which questions are being answered.
     */
    setCurrentJob(job: Job): void {
        this.job = job;
        this.aiAnswerer.setCurrentJob(job);
    }

    /**
     * Gets the current job for which questions are being answered.
     */
    getCurrentJob(): Job | undefined {
        return this.job;
    }

    /**
     * Loads CV data from a JSON file.
     */
    public loadCVData(): void {
        const cvFilePath = process.env.CV_FILE_PATH;
        try {
            if (cvFilePath && fs.existsSync(cvFilePath)) {
                const content = fs.readFileSync(cvFilePath, 'utf-8');
                this.cvData = JSON.parse(content);
            }
        } catch (e) {
            console.error("Error loading CV data from JSON file:", e);
        }
    }

    /**
     * Loads questions and answers from a JSON file.
     * 
     * @returns An array of questions and answers.
     */
    public loadQuestionsFromJson(): Array<any> {
        try {
            if (fs.existsSync(this.outputFile)) {
                const content = fs.readFileSync(this.outputFile, 'utf-8');
                const data = JSON.parse(content);
                if (Array.isArray(data)) {
                    return data;
                }
                throw new Error("JSON file format is incorrect. Expected a list of questions.");
            }
            return [];
        } catch (e) {
            console.error("Error loading questions data from JSON file:", e);
            return [];
        }
    }

    /**
     * Saves a question and its answer to the JSON file.
     * 
     * @param questionData An object containing the question and its answer.
     */
    public saveQuestionsToJson(questionData: Record<string, string>): void {
        questionData['question'] = this.sanitizeText(questionData['question']);
        let data: Array<any> = this.loadQuestionsFromJson();

        try {
            data.push(questionData);
            fs.writeFileSync(this.outputFile, JSON.stringify(data, null, 4));
        } catch (e) {
            console.error("Error saving questions data to JSON file:", e);
        }
    }

    /**
     * Sanitizes a text string by removing unwanted characters and normalizing whitespace.
     * 
     * @param text The text to sanitize.
     * @returns The sanitized text.
     */
    public sanitizeText(text: string): string {
        return text.toLowerCase()
            .trim()
            .replace(/["\\]/g, '')
            .replace(/[\x00-\x1F\x7F]/g, '')
            .replace(/\n/g, ' ')
            .replace(/\r/g, '')
            .replace(/,$/, '');
    }

    /**
     * Answers a textual question that can have a wide range of possible answers.
     * 
     * @param questionText The question text to answer.
     * @param description description, can be job description or context
     * @returns A promise that resolves to the answer string.
     */
    public async answerQuestionTextualWideRange(questionText: string, description: string): Promise<string> {
        // Example implementation; replace with actual logic using aiAnswerer
        return this.aiAnswerer.answerQuestionTextualWideRange(questionText, description);
    }

    /**
     * Answers a numerical question by extracting or calculating a number.
     * 
     * @param questionText The question text to answer.
     * @returns A promise that resolves to the numeric answer.
     */
    public async answerQuestionNumeric(questionText: string): Promise<number> {
        // Example implementation; replace with actual logic using aiAnswerer
        return this.aiAnswerer.answerQuestionNumeric(questionText);
    }

    /**
     * Answers a date-related question by providing an appropriate date.
     * 
     * @param questionText The question text to answer.
     * @returns A promise that resolves to the date answer.
     */
    public async answerQuestionDate(questionText: string): Promise<Date | null> {
        // Example implementation; replace with actual logic using aiAnswerer
        return this.aiAnswerer.answerQuestionDate(questionText);
    }

    /**
     * Answers a multiple-choice question by selecting the best option from the provided list.
     * 
     * @param questionText The question text to answer.
     * @param options The list of options to choose from.
     * @returns A promise that resolves to the selected answer string.
     */
    public async answerQuestionFromOptions(questionText: string, options: string[]): Promise<string> {
        // Example implementation; replace with actual logic using aiAnswerer
        return await this.aiAnswerer.answerQuestionFromOptions(questionText, options);
    }

    /**
     * Finds an existing answer for a question based on its sanitized text and type.
     * 
     * @param question The sanitized question text.
     * @param type The type of the question (e.g., "radio", "textbox").
     * @returns The found question and answer object, or undefined if not found.
     */
    public findQuestionAnswer(question: string, type: string): any {
        return this.questions.find(item => item['question'] === question && item['type'] === type);
    }

    /**
     * Extracts a number from a text response, assuming it contains a numerical answer.
     * 
     * @param text The text containing the number.
     * @returns The extracted number.
     */
    public findNumberInText(text: string): number {
        const match = text.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    }

    /**
     * Gets personal information stored in the class.
     * 
     * @returns An object containing personal information fields.
     */
    public getPersonalInformation(): PersonalInformation {
        if (!this.cvData) throw new Error("CV data not set in QuestionManager.");
        // Example personal information, replace with actual data
        return this.cvData?.personal_information;
    }

    async resumeOrCover(phrase: string): Promise<string> {
        return this.aiAnswerer.resumeOrCover(phrase);
    }
}

export { QuestionManager };
