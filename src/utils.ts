import fs from 'fs';
import { random } from 'lodash';
import path from 'path';
import { WebDriver, WebElement } from 'selenium-webdriver';
import { LoggingService } from './logging.service';
import { Achievement, EducationDetail, ExperienceDetail, Language, Resume, Skills } from './cv.interface';

const logger = new LoggingService("Utils");
const chromeProfilePath = path.join(process.cwd(), "chrome_profile", "linkedin_profile");

function ensureChromeProfile(): string {
    const profileDir = path.dirname(chromeProfilePath);
    if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true });
    }
    if (!fs.existsSync(chromeProfilePath)) {
        fs.mkdirSync(chromeProfilePath, { recursive: true });
    }
    return chromeProfilePath;
}

async function isScrollable(element: WebElement): Promise<boolean> {
    const scrollHeight = await element.getAttribute("scrollHeight");
    const clientHeight = await element.getAttribute("clientHeight");
    return parseInt(scrollHeight) > parseInt(clientHeight);
}

async function scrollPage(conf: {
    driver: WebDriver,
    scrollableElement: WebElement,
    start?: number,
    end?: number,
    step?: number,
    reverse?: boolean;
}) {
    let {
        start = 0,
        end = 3600,
        step = 100,
    } = conf;

    // Scroll down
    await scrollSlow({ ...conf, start, end, step });

    // Scroll back up by reversing the parameters
    await scrollSlow({ ...conf, start: end, end: start, step: -step, reverse: true });
}

async function scrollSlow(conf: { driver: WebDriver, scrollableElement: WebElement, start: number, end?: number, step?: number, reverse?: boolean; }): Promise<void> {
    let {
        driver,
        scrollableElement,
        start = 0,
        end = 3600,
        step = 100,
        reverse = false
    } = conf;
    if (reverse) {
        [start, end] = [end, start];
        step = -step;
    }
    if (step === 0) {
        throw new Error("Step cannot be zero.");
    }
    const scriptScrollTo = "arguments[0].scrollTop = arguments[1];";

    try {
        if (await scrollableElement.isDisplayed()) {
            if (!(await isScrollable(scrollableElement))) {
                logger.warn("The element is not scrollable.");
                return;
            }
            if ((step > 0 && start >= end) || (step < 0 && start <= end)) {
                logger.warn("No scrolling will occur due to incorrect start/end values.");
                return;
            }
            for (let position = start; (step > 0 ? position < end : position > end); position += step) {
                try {
                    await driver.executeScript(scriptScrollTo, scrollableElement, position);
                } catch (error) {
                    console.error(`Error during scrolling: ${error}`);
                }
                await sleep(random(100, 300));
            }
            await driver.executeScript(scriptScrollTo, scrollableElement, end);
            await sleep(1000);
        } else {
            logger.warn("The element is not visible.");
        }
    } catch (error) {
        logger.error(`Exception occurred: ${error}`);
    }
}


function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function sleepRandom(min: number, max: number): Promise<void> {
    const duration = random(min, max);
    logger.debug(`Sleeping for ${duration} ms...`);
    return sleep(duration);
}

function validateResume(resume: Resume) {
    const requiredFields = [
        'personal_information',
        'education_details',
        'experience_details',
        'projects',
        'achievements',
        'certifications',
        'languages',
        'interests',
        'availability',
        'salary_expectations',
        'self_identification',
        'legal_authorization',
        'work_preferences'
    ];

    for (const field of requiredFields) {
        if (!(field in resume)) {
            throw new Error(`Missing required field: ${field}`);
        }
    }

    return true;
}

function extractNumberFromString(outputStr: string): number {
    const numbers = outputStr.match(/\d+/g);
    if (numbers && numbers.length > 0) {
        return parseInt(numbers[0], 10);
    } else {
        throw new Error("No numbers found in the string");
    }
}

function formatExperienceDetails(experienceDetails: ExperienceDetail[]): string {
    return experienceDetails.map(detail => {
        const responsibilities = detail.key_responsibilities && detail.key_responsibilities.length > 0
            ? detail.key_responsibilities.map((resp, index) => `(${index + 1}) ${resp}`).join("\n  ")
            : "N/A";

        const skills = detail.skills_acquired && detail.skills_acquired.length > 0
            ? detail.skills_acquired.map((skill, index) => `(${index + 1}) ${skill}`).join(", ")
            : "N/A";

        return [
            detail.position ? `Position: ${detail.position}` : null,
            detail.company ? `Company: ${detail.company}` : null,
            detail.employment_period ? `Employment Period: ${detail.employment_period}` : null,
            detail.location ? `Location: ${detail.location}` : null,
            detail.industry ? `Industry: ${detail.industry}` : null,
            `Key Responsibilities:\n  ${responsibilities}`,
            `Skills Acquired: ${skills}`
        ].filter(Boolean).join("\n");
    }).join("\n\n");
}

export function formatResume(profile: Resume): string {
    const {
        personal_information,
        education_details,
        experience_details,
        achievements,
        languages,
        availability,
        salary_expectations,
        self_identification,
        legal_authorization,
        work_preferences
    } = profile;

    const personalInfo = [
        personal_information ? `Personal Information:\n- Name: ${personal_information.first_name} ${personal_information.last_name}` : null,
        personal_information?.date_of_birth ? `- Date of Birth: ${personal_information.date_of_birth}` : null,
        personal_information?.country ? `- Country: ${personal_information.country}` : null,
        personal_information?.city ? `- City: ${personal_information.city}` : null,
        personal_information?.address ? `- Address: ${personal_information.address}` : null,
        personal_information?.phone_country_code && personal_information?.phone ? `- Phone: ${personal_information.phone_country_code} ${personal_information.phone}` : null,
        personal_information?.email_address ? `- Email: ${personal_information.email_address}` : null,
        personal_information?.github ? `- GitHub: ${personal_information.github}` : null,
        personal_information?.linkedin ? `- LinkedIn: ${personal_information.linkedin}` : null
    ].filter(Boolean).join("\n");

    const educationInfo = education_details.map((edu: EducationDetail) => [
        `Education:`,
        edu.degree ? `- Degree: ${edu.degree}` : null,
        edu.university ? `- University: ${edu.university}` : null,
        edu.gpa ? `- GPA: ${edu.gpa}` : null,
        edu.graduation_year ? `- Graduation Year: ${edu.graduation_year}` : null,
        edu.field_of_study ? `- Field of Study: ${edu.field_of_study}` : null
    ].filter(Boolean).join("\n")).join("\n\n");

    const experienceInfo = formatExperienceDetails(experience_details);

    const achievementsInfo = achievements.map((ach: Achievement) => [
        `Achievements:`,
        ach.name ? `- ${ach.name}: ${ach.description}` : null
    ].filter(Boolean).join("\n")).join("\n\n");

    const languagesInfo = languages.map((lang: Language) => [
        `Languages:`,
        lang.language ? `- ${lang.language}: ${lang.proficiency}` : null
    ].filter(Boolean).join("\n")).join("\n\n");

    const availabilityInfo = availability.notice_period ? `Availability:\n- Notice Period: ${availability.notice_period}` : null;

    const salaryExpectationsInfo = salary_expectations.salary_range_usd ? `Salary Expectations:\n- Salary Range (USD): ${salary_expectations.salary_range_usd}` : null;

    const selfIdentificationInfo = [
        `Self Identification:`,
        self_identification?.gender ? `- Gender: ${self_identification.gender}` : null,
        self_identification?.pronouns ? `- Pronouns: ${self_identification.pronouns}` : null,
        self_identification?.veteran !== undefined ? `- Veteran: ${self_identification.veteran}` : null,
        self_identification?.disability !== undefined ? `- Disability: ${self_identification.disability}` : null,
        self_identification?.ethnicity ? `- Ethnicity: ${self_identification.ethnicity}` : null
    ].filter(Boolean).join("\n");

    const legalAuthorizationInfo = [
        `Legal Authorization:`,
        legal_authorization?.eu_work_authorization !== undefined ? `- EU Work Authorization: ${legal_authorization.eu_work_authorization}` : null,
        legal_authorization?.us_work_authorization !== undefined ? `- US Work Authorization: ${legal_authorization.us_work_authorization}` : null,
        legal_authorization?.requires_us_visa !== undefined ? `- Requires US Visa: ${legal_authorization.requires_us_visa}` : null,
        legal_authorization?.requires_us_sponsorship !== undefined ? `- Requires US Sponsorship: ${legal_authorization.requires_us_sponsorship}` : null,
        legal_authorization?.requires_eu_visa !== undefined ? `- Requires EU Visa: ${legal_authorization.requires_eu_visa}` : null,
        legal_authorization?.legally_allowed_to_work_in_eu !== undefined ? `- Legally Allowed to Work in EU: ${legal_authorization.legally_allowed_to_work_in_eu}` : null,
        legal_authorization?.legally_allowed_to_work_in_us !== undefined ? `- Legally Allowed to Work in US: ${legal_authorization.legally_allowed_to_work_in_us}` : null,
        legal_authorization?.requires_eu_sponsorship !== undefined ? `- Requires EU Sponsorship: ${legal_authorization.requires_eu_sponsorship}` : null
    ].filter(Boolean).join("\n");

    const workPreferencesInfo = [
        `Work Preferences:`,
        work_preferences?.remote_work !== undefined ? `- Remote Work: ${work_preferences.remote_work}` : null,
        work_preferences?.in_person_work !== undefined ? `- In-Person Work: ${work_preferences.in_person_work}` : null,
        work_preferences?.open_to_relocation !== undefined ? `- Open to Relocation: ${work_preferences.open_to_relocation}` : null,
        work_preferences?.willing_to_complete_assessments !== undefined ? `- Willing to Complete Assessments: ${work_preferences.willing_to_complete_assessments}` : null,
        work_preferences?.willing_to_undergo_drug_tests !== undefined ? `- Willing to Undergo Drug Tests: ${work_preferences.willing_to_undergo_drug_tests}` : null,
        work_preferences?.willing_to_undergo_background_checks !== undefined ? `- Willing to Undergo Background Checks: ${work_preferences.willing_to_undergo_background_checks}` : null
    ].filter(Boolean).join("\n");

    return [
        personalInfo,
        educationInfo,
        experienceInfo,
        achievementsInfo,
        languagesInfo,
        availabilityInfo,
        salaryExpectationsInfo,
        selfIdentificationInfo,
        legalAuthorizationInfo,
        workPreferencesInfo
    ].filter(Boolean).join("\n\n");
}

function formatSkills(skills: Skills): string {
    return `
Skills Summary:

- **Libraries**: ${skills.libraries}
- **General Skills**: ${skills.general_skills}
- **Programming Languages**: ${skills.programming_languages}
- **Integrations**: ${skills.integrations}
- **Design**: ${skills.design}
- **Databases**: ${skills.databases}
- **IT**: ${skills.IT}
- **Environments**: ${skills.environments}
- **Server**: ${skills.server}
    `.trim();
}

function findContent(obj: { [key: string]: any; }): string | null {
    for (const key in obj) {
        if (key === 'content') {
            logger.debug(`_findContent - Found content: ${obj[key]} at key: ${key}`);
            return obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            const result = findContent(obj[key]);
            if (result) {
                logger.debug(`_findContent - Found content in nested object: ${result}`);
                return result;
            }
        }
    }
    return null;
}

function toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, letter => `_${letter.toLowerCase()}`);
}

export { ensureChromeProfile, isScrollable, scrollSlow, scrollPage, findContent, toSnakeCase, sleep, random, validateResume, extractNumberFromString, sleepRandom, formatExperienceDetails, formatSkills };
