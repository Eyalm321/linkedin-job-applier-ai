import { WebDriver, WebElement, By } from 'selenium-webdriver';
import { ElementUtilities } from './element-utilities';
import { QuestionManager } from './questions-manager';
import { Job } from '../job';
import { random, sleep, sleepRandom } from '../utils';
import path from 'path';
import os from 'os';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import { LoggingService } from '../logging.service';
import { NoSuchElementError } from 'selenium-webdriver/lib/error';
import { toSnakeCase } from '../utils';

class ApplicationFormFiller {
    private driver: WebDriver;
    private elementUtils: ElementUtilities;
    private questionManager: QuestionManager;
    private processedElements: Set<string> = new Set();
    private processedSections: Set<string> = new Set();
    private logger: LoggingService;

    constructor(driver: WebDriver, questionManager: QuestionManager) {
        this.driver = driver;
        this.elementUtils = new ElementUtilities(driver);
        this.questionManager = questionManager;
        this.logger = new LoggingService("ApplicationFormFiller");
    }

    async fillApplicationForm(job: Job): Promise<void> {
        let isCompleted = false;

        while (!isCompleted) {
            this.logger.info("Filling application form...");
            const allElementsProcessed = await this.fillUp(job);

            if (!allElementsProcessed) {
                this.logger.warn("ALERT: One or more form elements could not be filled.");
                await sleep(120000); // Sleep for 120 seconds if there's a failure
            } else {
                this.logger.success("All form elements processed successfully.");
                isCompleted = await this.nextOrSubmit();
            }
        }
    }

    private async fillUp(job: Job): Promise<boolean> {
        try {
            await this.checkForSafetyTipsModal();
            return await this.locateAndProcessFormElements(job);
        } catch (e) {
            this.logger.error(`Error filling up application form: ${e}`);
            return false;
        }
    }

    private async locateAndProcessFormElements(job: Job): Promise<boolean> {
        const easyApplyContent = await this.driver.findElement(By.className('jobs-easy-apply-content'));
        const formElements = await easyApplyContent.findElements(By.css('[data-test-form-element]'));
        let allElementsProcessed = true;

        for (let i = 0; i < formElements.length; i++) {
            this.logger.info(`Processing form element ${i + 1}/${formElements.length}...`);
            const success = await this.processFormElement(formElements[i], job);
            if (!success) {
                allElementsProcessed = false;
                this.logger.warn(`Attempt at Form element ${i + 1}/${formElements.length} failed.`);
                break; // If an element fails, stop further processing to avoid unnecessary loops
            } else {
                this.logger.success(`Form element ${i + 1}/${formElements.length} processed successfully.`);
            }
        }

        return allElementsProcessed;
    }

    private async processFormElement(element: WebElement, job: Job): Promise<boolean> {
        try {
            await sleepRandom(500, 1000);
            const elementId = await this.elementUtils.getUniqueElementIdentifier(element);

            if (this.processedElements.has(elementId)) {
                this.logger.info(`Element ${elementId} already processed. Skipping.`);
                return true;
            }

            const isAlreadyFilled = await this.elementUtils.isElementAlreadyFilled(element);
            if (isAlreadyFilled) {
                this.logger.info(`Element ${elementId} already filled. Marking as processed.`);
                this.processedElements.add(elementId);
                return true;
            }

            const success = await this.processSpecificFormElement(element, job);
            if (success) {
                this.processedElements.add(elementId);
                this.logger.success(`Element ${elementId} processed successfully.`);
            }
            return success;
        } catch (e: any) {
            if (e.name === 'StaleElementReferenceError') {
                this.logger.warn('Encountered stale element. Retrying...');
                return await this.retryStaleElement(element, job);
            } else {
                this.logger.error(`Error processing form element: ${e}`);
                return false;
            }
        }
    }

    private async processSpecificFormElement(element: WebElement, job: Job): Promise<boolean> {
        try {
            if (await this.isUploadField(element)) {
                await this.handleUploadFields(element, job);
            } else {
                await this.fillAdditionalQuestions();
            }
            return true;
        } catch (e) {
            if (!(e instanceof NoSuchElementError)) {
                this.logger.error(`Error processing specific form element: ${e}`);
            }
            return false;
        }
    }

    private async handleUploadFields(element: WebElement, job: Job): Promise<void> {
        try {
            const fileUploadElements = await this.driver.findElements(By.xpath("//input[@type='file']"));

            for (let i = 0; i < fileUploadElements.length; i++) {
                await this.processUploadElement(fileUploadElements[i], job);
            }
        } catch (e) {
            this.logger.error(`Error handling upload fields: ${e}`);
            throw e;
        }
    }

    private async processUploadElement(uploadElement: WebElement, job: Job): Promise<void> {
        try {
            const parent = await uploadElement.findElement(By.xpath(".."));
            await this.driver.executeScript("arguments[0].classList.remove('hidden')", uploadElement);

            const parentText = await parent.getText();
            const output = await this.questionManager.resumeOrCover(parentText.toLowerCase());

            if (output.includes('resume')) {
                await this.uploadResume(uploadElement);
            } else if (output.includes('cover')) {
                await this.createAndUploadCoverLetter(uploadElement);
            } else {
                this.logger.warn("No valid output detected (neither 'resume' nor 'cover'), skipping upload.");
            }
        } catch (e: any) {
            if (e.name === 'StaleElementReferenceError') {
                await this.retryUploadElement(uploadElement, job);
            } else {
                throw e;
            }
        }
    }

    private async fillAdditionalQuestions(): Promise<void> {
        const formSections = await this.driver.findElements(By.className('jobs-easy-apply-form-section__grouping'));
        this.logger.info(`Found ${formSections.length} form sections.`);
        for (const section of formSections) {
            const sectionId = await this.getSectionIdentifier(section);
            this.logger.info(`Processing section ${sectionId}...`);
            if (this.processedSections.has(sectionId)) {
                this.logger.info(`Section ${sectionId} already processed. Skipping.`);
                continue;
            }

            if (await this.isPredefinedValue(section)) {
                await this.fillPredefinedValue(section);
            } else {
                await this.processFormSection(section);
            }

            this.processedSections.add(sectionId);
        }
    }

    private async getSectionIdentifier(section: WebElement): Promise<string> {
        const id = await section.getAttribute('id');
        if (id) return id;

        const classes = await section.getAttribute('class');
        const text = await section.getText();
        return `${classes}-${this.hashString(text)}`;
    }

    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }

    private async isPredefinedValue(section: WebElement): Promise<boolean> {
        const predefinedValues = Object.keys(this.questionManager.getPersonalInformation());
        const sectionText = await section.getText();
        return predefinedValues.some(value => sectionText.toLowerCase().includes(value.toLowerCase()));
    }

    private async fillPredefinedValue(section: WebElement): Promise<void> {
        const sectionText = await section.getText();
        const predefinedValue = Object.entries(this.questionManager.getPersonalInformation()).find(([key, value]) =>
            sectionText.toLowerCase().includes(key.toLowerCase())
        );

        if (predefinedValue) {
            const [key, value] = predefinedValue;
            // handle predefined value
        }
    }

    private async processFormSection(section: WebElement): Promise<void> {
        try {
            // Log the section's text for context
            const sectionText = await section.getText();
            this.logger.debug(`Processing section with text: ${sectionText}`);

            // Check for predefined values and fill the section accordingly
            const predefinedValue = Object.entries(this.questionManager.getPersonalInformation())
                .find(([key, value]) => {
                    this.logger.debug(`Checking for predefined value: ${key.toLowerCase()} against section text: ${toSnakeCase(sectionText)}`);
                    return toSnakeCase(sectionText).includes(key.toLowerCase());
                });


            if (predefinedValue) {
                const [key, value] = predefinedValue;
                this.logger.info(`Found predefined value for ${key}: ${value}`);
                const success = await this.fillSectionWithPredefinedValue(section, value);
                if (success) {
                    this.logger.success(`Section filled with predefined value for ${key}`);
                    return;
                } else {
                    this.logger.warn(`Failed to fill section with predefined value for ${key}`);
                }
            } else {
                this.logger.debug('No predefined value found for this section.');
            }

            // Process section with specific handlers if no predefined value was used or if it failed
            const handlers = [
                this.handleTermsOfService,
                this.handleSingleCheckbox,
                this.findAndHandleRadioQuestion,
                this.findAndHandleDropdownQuestion,
                this.findAndHandleTextboxQuestion,
                this.findAndHandleMultipleCheckboxes,
                this.findAndHandleDateQuestion
            ];

            for (const handler of handlers) {
                this.logger.debug(`Attempting to process section with handler: ${handler.name}`);
                const handled = await handler.call(this, section);
                if (handled) {
                    this.logger.info(`Section successfully processed by ${handler.name}`);
                    return;
                } else {
                    this.logger.debug(`${handler.name} did not handle the section.`);
                }
            }

            this.logger.info('Section not handled by any specific handler');
        } catch (error) {
            this.logger.error(`Error processing section: ${error}`);
        }
    }


    private async fillSectionWithPredefinedValue(section: WebElement, value: string): Promise<boolean> {
        try {
            // First, check if the section contains a dropdown
            const dropdownElements = await section.findElements(By.css('select'));
            if (dropdownElements.length > 0) {
                const dropdownHandled = await this.handleDropdownQuestion({
                    dropdown: dropdownElements[0],
                    optionsElements: await dropdownElements[0].findElements(By.css('option')),
                    overrideAnswer: value
                });
                if (dropdownHandled) return true;
            }

            // If no dropdown is found, check for text fields or text areas
            const textFields = await this.findTextboxQuestions(section);
            if (textFields.length > 0) {
                const textFieldHandled = await this.handleTextboxQuestion({
                    section,
                    textField: textFields[0],
                    overrideAnswer: value
                });
                if (textFieldHandled) return true;
            }

            // Handle radio buttons
            const radioHandled = await this.handleRadioQuestion(section, value);
            if (radioHandled) return true;

            // Handle date fields
            const dateHandled = await this.handleDateQuestion({
                dateField: await section.findElement(By.css('input[type="date"]')),
                questionText: await this.getQuestionText(section),
                overrideAnswer: value
            });
            if (dateHandled) return true;

            // Handle checkboxes
            const checkboxHandled = await this.handleSingleCheckbox(section);
            if (checkboxHandled) return true;

            // Handle multiple checkboxes
            const multipleCheckboxesHandled = await this.findAndHandleMultipleCheckboxes(section);
            if (multipleCheckboxesHandled) return true;

            return false; // If no predefined value could be applied
        } catch (error) {
            this.logger.error(`Error filling section with predefined value: ${error}`);
            return false;
        }
    }



    private async handleSingleCheckbox(section: WebElement): Promise<boolean> {
        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                this.logger.debug(`Attempt ${attempt + 1} to handle checkbox.`);

                const checkboxFieldset = await section.findElement(By.css('fieldset[data-test-checkbox-form-component="true"]')).catch(() => null);
                if (!checkboxFieldset) {
                    this.logger.warn("Checkbox fieldset not found. Falling back.");
                    return false;
                }

                const checkboxLabel = await checkboxFieldset.findElement(By.css('label')).catch(() => null);
                const checkboxInput = await checkboxFieldset.findElement(By.css('input[type="checkbox"]')).catch(() => null);

                if (!checkboxLabel || !checkboxInput) {
                    this.logger.warn("Checkbox label or input not found. Falling back.");
                    return false;
                }

                if (await checkboxInput.isDisplayed() && await checkboxInput.isEnabled()) {
                    this.logger.debug("Checkbox is visible and enabled. Clicking the label.");
                    await checkboxLabel.click();
                    await sleepRandom(500, 1000);

                    const isChecked = await checkboxInput.isSelected();
                    if (isChecked) {
                        this.logger.success("Checkbox successfully checked.");
                        return true;
                    } else {
                        this.logger.warn("Checkbox not checked. Retrying...");
                    }
                } else {
                    this.logger.warn("Checkbox is either not visible or not enabled.");
                    return false;
                }
            } catch (error: any) {
                this.logger.error(`Error handling checkbox: ${error}`);
                return false;
            }

            attempt++;
            await sleepRandom(500, 1000); // Wait before retrying
        }

        this.logger.error("Failed to check the checkbox after multiple attempts.");
        return false;
    }

    private async findMultipleCheckboxes(section: WebElement): Promise<{ fieldset: WebElement, checkboxes: WebElement[], labels: WebElement[]; } | null> {
        try {
            this.logger.debug("Attempting to find multiple checkboxes fieldset.");

            const checkboxFieldset = await section.findElement(By.css('fieldset[data-test-checkbox-form-component="true"]')).catch(() => null);
            if (!checkboxFieldset) {
                this.logger.warn("Multiple checkbox fieldset not found.");
                return null;
            }

            const checkboxes = await checkboxFieldset.findElements(By.css('input[type="checkbox"]'));
            const labels = await checkboxFieldset.findElements(By.css('label'));

            if (checkboxes.length === 0 || labels.length === 0) {
                this.logger.warn("Checkboxes or labels not found within the fieldset.");
                return null;
            }

            return { fieldset: checkboxFieldset, checkboxes, labels };
        } catch (error: any) {
            this.logger.error(`Error finding multiple checkboxes: ${error}`);
            return null;
        }
    }

    private async handleMultipleCheckboxes(data: { fieldset: WebElement, checkboxes: WebElement[], labels: WebElement[]; }): Promise<boolean> {
        const { fieldset, checkboxes, labels } = data;
        const maxRetries = 3;
        let attempt = 0;
        let allCheckboxesChecked = true;

        while (attempt < maxRetries) {
            try {
                this.logger.debug(`Attempt ${attempt + 1} to handle multiple checkboxes.`);

                // Extract the text from the fieldset to use as the question text
                const questionText = (await fieldset.getText()).toLowerCase().trim();
                this.logger.debug(`Multiple checkbox question text: ${questionText}`);

                // Extract label texts to use with the question manager
                const options = await Promise.all(labels.map(async label => await label.getText()));
                this.logger.debug(`Multiple checkbox options: ${options}`);

                // Use the question manager to determine which checkboxes should be selected
                const answer = await this.questionManager.answerQuestionFromOptions(questionText, options);
                this.logger.debug(`Selected answer from options: ${answer}`);

                for (let i = 0; i < checkboxes.length; i++) {
                    const checkbox = checkboxes[i];
                    const label = labels[i];
                    const labelText = await label.getText();

                    if (answer.includes(labelText) && !await checkbox.isSelected()) {
                        this.logger.debug(`Selecting checkbox for label: ${labelText}`);
                        await label.click();
                        await sleepRandom(500, 1000);

                        const isChecked = await checkbox.isSelected();
                        if (!isChecked) {
                            this.logger.warn(`Checkbox ${i + 1} not checked. Retrying...`);
                            allCheckboxesChecked = false;
                        } else {
                            this.logger.success(`Checkbox ${i + 1} checked successfully.`);
                        }
                    } else if (await checkbox.isSelected()) {
                        this.logger.info(`Checkbox ${i + 1} for label "${labelText}" already checked. Skipping.`);
                    }
                }

                if (allCheckboxesChecked) {
                    return true;
                }
            } catch (e: any) {
                if (!(e instanceof NoSuchElementError)) {
                    this.logger.error(`Error handling multiple checkboxes: ${e}`);
                }
                allCheckboxesChecked = false;
            }

            attempt++;
            await sleepRandom(500, 1000); // Wait before retrying
        }

        this.logger.error("Failed to check all checkboxes after multiple attempts.");
        return allCheckboxesChecked;
    }


    private async findAndHandleMultipleCheckboxes(section: WebElement): Promise<boolean> {
        const checkboxesData = await this.findMultipleCheckboxes(section);
        if (!checkboxesData) return false;

        return await this.handleMultipleCheckboxes(checkboxesData);
    }



    private async handleTermsOfService(section: WebElement): Promise<boolean> {
        const checkbox = await section.findElements(By.css('label'));
        if (checkbox.length > 0 && /terms of service|privacy policy|terms of use/i.test((await checkbox[0].getText()).toLowerCase())) {
            await checkbox[0].click();
            await sleepRandom(1000, 2000);
            return true;
        }
        return false;
    }

    private async findRadioQuestions(section: WebElement): Promise<WebElement[]> {
        try {
            const fieldsets = await section.findElements(By.css('fieldset[data-test-form-builder-radio-button-form-component="true"]'));
            return fieldsets;
        } catch (error) {
            this.logger.error(`Error finding radio questions: ${error}`);
            return [];
        }
    }

    private async handleRadioQuestion(
        fieldset: WebElement,
        overrideAnswer?: string
    ): Promise<boolean> {
        try {
            const radios = await fieldset.findElements(By.css('div.fb-text-selectable__option'));
            if (radios.length === 0) return false;

            // Attempt to find the question text
            const questionTextElement = await fieldset.findElement(By.css(
                'legend > span.fb-dash-form-element__label-title--is-required, legend > span.fb-dash-form-element__label'));
            const questionText = (await questionTextElement.getText()).toLowerCase();
            this.logger.info(`Processing radio question: ${questionText}`);

            // Gather radio options
            const options = await Promise.all(radios.map(async radio => {
                return await this.getQuestionText(radio);
            }));

            // Sanitize question and search for an existing answer
            const sanitizedQuestion = this.questionManager.sanitizeText(questionText);
            const existingAnswer = overrideAnswer || this.questionManager.findQuestionAnswer(sanitizedQuestion, 'radio')?.['answer'];
            this.logger.debug(`Existing answer: ${existingAnswer}`);

            if (existingAnswer) {
                await this.selectRadio(radios, existingAnswer);
                return true;
            }

            this.logger.debug(`Answer not found for question: ${questionText}`);
            const answer = await this.questionManager.answerQuestionTextualWideRange(questionText, options);

            // Save the question-answer pair
            this.questionManager.saveQuestionsToJson({ type: 'radio', question: questionText, answer });

            await sleepRandom(1000, 2000);  // Simulate human-like delay
            await this.selectRadio(radios, answer);

            return true;
        } catch (error) {
            this.logger.error(`Error handling radio question: ${error}`);
            return false;
        }
    }


    private async findAndHandleRadioQuestion(section: WebElement): Promise<boolean> {
        const fieldsets = await this.findRadioQuestions(section);
        if (fieldsets.length === 0) return false;

        for (const fieldset of fieldsets) {
            const handled = await this.handleRadioQuestion(fieldset);
            if (handled) return true;
        }
        return false;
    }

    private async getLabelElement(element: WebElement): Promise<WebElement | null> {
        try {
            const labelElement = await element.findElement(By.css('label'));
            return labelElement;
        } catch (error) {
            this.logger.warn(`Label element not found for the provided element: ${error}`);
            return null;
        }
    }


    private async selectRadio(radios: WebElement[], answer: string): Promise<void> {
        this.logger.debug(`Answer to match: [${answer}]`);
        for (const radio of radios) {
            const optionText = await this.getQuestionText(radio);

            if (optionText === answer.toLowerCase()) {
                const inputElement = await radio.findElement(By.css('input'));
                await inputElement.click();
                this.logger.debug(`Selected radio option: ${optionText}`);
                return;
            } else {
                this.logger.warn(`Radio option not matching: ${optionText}`);
            }
        }
        this.logger.warn(`No matching radio option found for answer: ${answer}`);
    }

    private async findTextboxQuestions(section: WebElement): Promise<WebElement[]> {
        try {
            const inputFields = await section.findElements(By.css('input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])'));
            const textAreaFields = await section.findElements(By.css('textarea'));
            return inputFields.concat(textAreaFields);
        } catch (error) {
            this.logger.error(`Error finding textbox questions: ${error}`);
            return [];
        }
    }


    private async handleTextboxQuestion(data: {
        section: WebElement,
        textField: WebElement,
        overrideAnswer?: string;
    }): Promise<boolean> {
        const { section, textField, overrideAnswer } = data;
        try {
            const questionText = await this.getQuestionText(section);
            const isNumeric = await this.elementUtils.isNumericField(textField);
            const questionType = isNumeric ? 'numeric' : 'textbox';

            const sanitizedQuestion = this.questionManager.sanitizeText(questionText);
            const existingAnswer = overrideAnswer || this.questionManager.findQuestionAnswer(sanitizedQuestion, questionType)?.['answer'];
            const answer = existingAnswer || (isNumeric
                ? await this.questionManager.answerQuestionNumeric(questionText)
                : await this.questionManager.answerQuestionTextualWideRange(questionText));

            if (!existingAnswer) {
                this.questionManager.saveQuestionsToJson({ type: questionType, question: questionText, answer: String(answer) });
                await sleepRandom(1000, 2000);
            }

            await this.elementUtils.enterText(textField, String(answer));
            await this.checkForErrorsAfterTextInput(section, textField, String(answer));
            return true;
        } catch (error) {
            this.logger.error(`Error handling textbox question: ${error}`);
            return false;
        }
    }


    private async findAndHandleTextboxQuestion(section: WebElement): Promise<boolean> {
        const textFields = await this.findTextboxQuestions(section);
        if (textFields.length === 0) return false;

        return await this.handleTextboxQuestion({
            section,
            textField: textFields[0]
        });
    }


    private async getQuestionText(section: WebElement): Promise<string> {
        try {
            const labelElement = await this.getLabelElement(section);
            if (labelElement) {
                this.logger.debug("Label element found. Extracting text.");
                return (await labelElement.getText()).toLowerCase().trim();
            } else {
                this.logger.debug("Label element not found. Falling back to group title or subtitle.");
                return await this.fallbackToGroupTitleOrSubtitle(section);
            }
        } catch {
            return await this.fallbackToGroupTitleOrSubtitle(section);
        }
    }

    private async checkForErrorsAfterTextInput(section: WebElement, textField: WebElement, answer: string): Promise<void> {
        try {
            const errorElement = await section.findElement(By.css(".artdeco-inline-feedback.artdeco-inline-feedback--error"));
            if (errorElement) {
                this.logger.debug("Error element detected after entering text. Extracting number from the response.");
                const text = await textField.getAttribute('value');
                this.logger.debug(`checkForErrorsAfterTextInput: Text: ${text}`);
                const number = this.questionManager.findNumberInText(text);
                await this.elementUtils.enterText(textField, String(number));
            }
        } catch {
            this.logger.trivial("Error element not found after entering text.");
        }
    }

    private async fallbackToGroupTitleOrSubtitle(section: WebElement): Promise<string> {
        this.logger.debug("Falling back to group title or subtitle.");

        // Helper function to get text from elements
        const getTextFromElements = async (elements: WebElement[]): Promise<string | null> => {
            for (const element of elements) {
                const text = await element.getText();
                if (text.trim() !== '') return text.toLowerCase();
            }
            return null;
        };

        try {
            this.logger.debug("Navigating to parent element of the section.");
            const parentElement = await section.findElement(By.xpath('..'));

            this.logger.debug("Attempting to find preceding group title element.");
            const groupTitleElements = await parentElement.findElements(
                By.xpath('./preceding-sibling::*[contains(@class, "jobs-easy-apply-form-section__group-title")]')
            );
            this.logger.debug(`Group title elements found: ${groupTitleElements.length}`);
            let text = await getTextFromElements(groupTitleElements);
            if (text) return text;

            this.logger.debug("Attempting to find preceding group subtitle element.");
            const groupSubtitleElements = await parentElement.findElements(
                By.xpath('./preceding-sibling::*[contains(@class, "jobs-easy-apply-form-section__group-subtitle")]')
            );
            this.logger.debug(`Group subtitle elements found: ${groupSubtitleElements.length}`);
            text = await getTextFromElements(groupSubtitleElements);
            if (text) return text;

            this.logger.debug("Attempting to find group title and subtitle elements within the parent element.");
            const allGroupTitleElements = await parentElement.findElements(By.css('.jobs-easy-apply-form-section__group-title'));
            const allGroupSubtitleElements = await parentElement.findElements(By.css('.jobs-easy-apply-form-section__group-subtitle'));

            this.logger.debug(`All group title elements found: ${allGroupTitleElements.length}`);
            text = await getTextFromElements(allGroupTitleElements);
            if (text) return text;

            this.logger.debug(`All group subtitle elements found: ${allGroupSubtitleElements.length}`);
            text = await getTextFromElements(allGroupSubtitleElements);
            if (text) return text;

            this.logger.debug("No group title or subtitle found after extended search.");

        } catch (error: any) {
            this.logger.error(`Error falling back to group title or subtitle: ${error}`);
        }

        throw new Error("Failed to find valid question text");
    }



    private async findDateQuestion(section: WebElement): Promise<{ dateField: WebElement; questionText: string; } | null> {
        try {
            const dateFields = await section.findElements(By.className('artdeco-datepicker__input'));
            if (dateFields.length > 0) {
                const dateField = dateFields[0];
                const questionText = (await section.getText()).toLowerCase();
                return { dateField, questionText };
            }
            return null;
        } catch (error) {
            this.logger.error(`Error finding date question: ${error}`);
            return null;
        }
    }

    private async handleDateQuestion(data: {
        dateField: WebElement,
        questionText?: string,
        overrideAnswer?: string;
    }): Promise<boolean> {
        const { dateField, questionText, overrideAnswer } = data;
        try {
            if (overrideAnswer) {
                await this.elementUtils.enterText(dateField, overrideAnswer);
                return true;
            }
            if (!questionText) return false;

            const sanitizedQuestion = this.questionManager.sanitizeText(questionText);
            const existingAnswer = overrideAnswer || this.questionManager.findQuestionAnswer(sanitizedQuestion, 'date')?.['answer'];

            const answerDate = existingAnswer || (await this.questionManager.answerQuestionDate(questionText))?.toISOString().split('T')[0];

            if (!answerDate) return false;

            if (!existingAnswer) {
                this.questionManager.saveQuestionsToJson({ type: 'date', question: questionText, answer: answerDate });
                await sleepRandom(1000, 2000);
            }

            await this.elementUtils.enterText(dateField, answerDate);
            return true;
        } catch (error) {
            this.logger.error(`Error handling date question: ${error}`);
            return false;
        }
    }


    private async findAndHandleDateQuestion(section: WebElement): Promise<boolean> {
        const questionData = await this.findDateQuestion(section);
        if (!questionData) return false;

        const { dateField, questionText } = questionData;
        return await this.handleDateQuestion({ dateField, questionText });
    }


    private async findDropdownQuestion(section: WebElement): Promise<{ questionText: string; dropdown: WebElement; optionsElements: WebElement[]; } | null> {
        try {
            const question = await section.findElement(By.className('jobs-easy-apply-form-element'));
            const questionText = (await question.findElement(By.css('label')).getText()).toLowerCase();
            this.logger.debug(`Dropdown question object: ${questionText}`);
            const dropdown = await question.findElement(By.css('select'));

            if (dropdown) {
                const optionsElements = await dropdown.findElements(By.css('option'));
                return { questionText, dropdown, optionsElements };
            }
            return null;
        } catch (error) {
            this.logger.error(`Error finding dropdown question: ${error}`);
            return null;
        }
    }

    private async handleDropdownQuestion(
        data: {
            dropdown: WebElement,
            optionsElements: WebElement[],
            questionText?: string,
            overrideAnswer?: string;
        }): Promise<boolean> {
        const { dropdown, optionsElements, questionText, overrideAnswer } = data;
        try {
            const options = await Promise.all(optionsElements.map(async option => await option.getText()));
            let answer: string | undefined;
            this.logger.debug(`Dropdown options: ${options}`);
            this.logger.debug(`Dropdown question text: ${questionText}`);
            if (!overrideAnswer && questionText) {
                const sanitizedQuestion = this.questionManager.sanitizeText(questionText);
                const existingAnswer = this.questionManager.findQuestionAnswer(sanitizedQuestion, 'dropdown')?.['answer'];
                if (existingAnswer) {
                    answer = existingAnswer;
                    this.logger.debug(`Existing answer found for question: ${existingAnswer}`);
                } else {
                    answer = await this.questionManager.answerQuestionFromOptions(questionText, options);
                    this.logger.debug(`Answer from options: ${answer}`);
                }
            }

            if (overrideAnswer) {
                answer = overrideAnswer;
            }

            this.logger.debug(`Dropdown answer: ${answer}`);

            if (!answer || !questionText) return false;


            this.questionManager.saveQuestionsToJson({ type: 'dropdown', question: questionText, answer });
            await sleepRandom(1000, 2000);


            await this.selectDropdownOption(dropdown, answer, optionsElements);
            return true;
        } catch (error) {
            this.logger.error(`Error handling dropdown question: ${error}`);
            return false;
        }
    }


    private async findAndHandleDropdownQuestion(section: WebElement): Promise<boolean> {
        const questionData = await this.findDropdownQuestion(section);
        this.logger.info(`Dropdown question data: ${JSON.stringify(questionData)}`);
        if (!questionData) return false;

        const { questionText, dropdown, optionsElements } = questionData;
        return await this.handleDropdownQuestion({
            dropdown,
            optionsElements,
            questionText
        });
    }


    private async selectDropdownOption(dropdown: WebElement, text: string, optionsElements: WebElement[]): Promise<void> {
        const selectedOption = await dropdown.getAttribute('value');
        if (selectedOption !== text) {
            for (const option of optionsElements) {
                const optionText = await option.getText();
                if (optionText === text) {
                    await option.click();
                    await sleepRandom(1000, 2000);
                    break;
                }
            }
        } else {
            this.logger.info(`Skipping dropdown selection for element with current value: ${selectedOption}`);
        }
    }

    private async nextOrSubmit(): Promise<boolean> {
        try {
            const nextButton = await this.driver.findElement(By.className("artdeco-button--primary"));
            const buttonText = (await nextButton.getText()).toLowerCase();

            if (buttonText.includes('submit application')) {
                await this.unfollowCompany();
                await nextButton.click();
                await sleepRandom(3000, 5000);
                return true; // Application completed
            }

            await this.driver.executeScript("arguments[0].click();", nextButton);
            await sleepRandom(3000, 5000);
            return false; // More sections to fill
        } catch (e) {
            this.logger.error(`Error clicking 'Next' or 'Submit' button: ${e}`);
            return false;
        }
    }

    private async unfollowCompany(): Promise<void> {
        try {
            const followCheckbox = await this.driver.findElement(By.xpath("//label[contains(.,'to stay up to date with their page.')]"));
            await followCheckbox.click();
            await sleepRandom(1000, 2000);
        } catch (e) { /* Ignored */ }
    }

    private async checkForSafetyTipsModal(): Promise<void> {
        const safetyTipsModal = await this.driver.findElements(By.css('.job-trust-pre-apply-safety-tips-modal__content'));

        if (safetyTipsModal.length > 0) {
            await this.clickContinueApplyingButton();
        } else {
            this.logger.trivial("Safety tips modal not found. Proceeding to form filling...");
        }
    }

    private async clickContinueApplyingButton(): Promise<void> {
        try {
            const continueButton = await this.driver.findElement(By.css('button.jobs-apply-button'));
            await continueButton.click();
            await sleepRandom(1000, 1500);
        } catch (e: any) {
            this.logger.error(`Error clicking 'Continue Applying' button: ${e}`);
            throw e;
        }
    }

    private async retryStaleElement(element: WebElement, job: Job): Promise<boolean> {
        this.logger.error("StaleElementReferenceError caught. Attempting to re-locate elements and retry.");
        try {
            const easyApplyContent = await this.driver.findElement(By.className('jobs-easy-apply-content'));
            const newFormElements = await easyApplyContent.findElements(By.css('[data-test-form-element]'));
            const index = newFormElements.indexOf(element);

            if (newFormElements.length > index) {
                const success = await this.processSpecificFormElement(newFormElements[index], job);
                await sleepRandom(1000, 1500);
                return success;
            } else {
                this.logger.error("Failed to re-locate form elements after StaleElementReferenceError.");
                return false;
            }
        } catch (error) {
            this.logger.error(`Error retrying stale element: ${error}`);
            return false;
        }
    }

    private async isUploadField(element: WebElement): Promise<boolean> {
        const fileInputs = await element.findElements(By.xpath(".//input[@type='file']"));
        return fileInputs.length > 0;
    }

    private async retryUploadElement(uploadElement: WebElement, job: Job): Promise<void> {
        const retryFileUploadElements = await this.driver.findElements(By.xpath("//input[@type='file']"));
        const index = retryFileUploadElements.indexOf(uploadElement);

        if (retryFileUploadElements.length > index) {
            await this.processUploadElement(retryFileUploadElements[index], job);
        } else {
            throw new Error("Failed to re-locate file upload elements after StaleElementReferenceError.");
        }
    }

    private async uploadResume(uploadElement: WebElement): Promise<void> {
        const resumePath = process.env.RESUME_PATH;
        if (!resumePath) {
            throw new Error("Resume path not set in environment variables.");
        }
        await uploadElement.sendKeys(resumePath);
    }

    private async createAndUploadCoverLetter(uploadElement: WebElement): Promise<void> {
        const coverLetter = await this.questionManager.answerQuestionTextualWideRange("Write a cover letter");
        const tempFilePath = path.join(os.tmpdir(), `cover_letter_${random(0, 9999)}.pdf`);
        await this.generatePDF(coverLetter, tempFilePath);
        await uploadElement.sendKeys(tempFilePath);
    }

    private async generatePDF(text: string, filePath: string): Promise<void> {
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
}

export { ApplicationFormFiller };
