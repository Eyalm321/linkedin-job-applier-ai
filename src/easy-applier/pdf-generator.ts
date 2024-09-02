import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { WebElement } from 'selenium-webdriver';

class PDFGenerator {
    private resumePath: string | null;

    constructor(resumePath: string | null) {
        this.resumePath = resumePath;
    }

    /**
     * Generates a PDF file with the provided text and saves it to the specified file path.
     * 
     * @param text The content to include in the PDF.
     * @param filePath The path where the PDF will be saved.
     * @returns A promise that resolves when the PDF is generated and saved.
     */
    public async generatePDF(text: string, filePath: string): Promise<void> {
        const doc = new PDFDocument({ size: 'LETTER' });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        doc.text(text, 100, 100);
        doc.end();
        await new Promise<void>((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });
    }

    /**
     * Uploads a resume file to the specified upload element.
     * 
     * @param uploadElement The web element representing the file upload input.
     * @returns A promise that resolves when the resume is uploaded.
     */
    public async uploadResume(uploadElement: WebElement): Promise<void> {
        if (this.resumePath && fs.existsSync(this.resumePath)) {
            await uploadElement.sendKeys(this.resumePath);
        } else {
            await this.uploadGeneratedResume(uploadElement);
        }
    }

    /**
     * Uploads a generated resume to the specified upload element.
     * 
     * @param uploadElement The web element representing the file upload input.
     * @returns A promise that resolves when the generated resume is uploaded.
     */
    public async uploadGeneratedResume(uploadElement: WebElement): Promise<void> {
        const resumePath = process.env.RESUME_PATH;
        if (!resumePath) {
            throw new Error("Resume path not set in environment variables.");
        }
        await uploadElement.sendKeys(resumePath);
    }

    /**
     * Creates a cover letter based on the provided text, generates a PDF, and uploads it.
     * 
     * @param uploadElement The web element representing the file upload input.
     * @returns A promise that resolves when the cover letter is created, saved, and uploaded.
     */
    public async createAndUploadCoverLetter(uploadElement: WebElement): Promise<void> {
        const coverLetterText = "Your generated cover letter content goes here.";  // Replace with actual content generation logic
        const tempFilePath = path.join(os.tmpdir(), `cover_letter_${Date.now()}.pdf`);
        await this.generatePDF(coverLetterText, tempFilePath);
        await uploadElement.sendKeys(tempFilePath);
    }
}

export { PDFGenerator };
