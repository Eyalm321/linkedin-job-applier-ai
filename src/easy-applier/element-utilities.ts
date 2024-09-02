import { WebDriver, WebElement, By } from 'selenium-webdriver';
import { scrollSlow, sleepRandom } from '../utils';
import { LoggingService } from '../logging.service';

class ElementUtilities {
    private driver: WebDriver;
    private logger: LoggingService;

    constructor(driver: WebDriver) {
        this.driver = driver;
        this.logger = new LoggingService("ElementUtilities");
    }

    /**
     * Scrolls the specified element into view, centering it on the screen.
     * 
     * @param element The web element to scroll into view.
     * @returns A promise that resolves when the element is scrolled into view.
     */
    public async scrollIntoView(element: WebElement): Promise<void> {
        await this.driver.executeScript("arguments[0].scrollIntoView({block: 'center', inline: 'nearest'});", element);
    }

    /**
     * Scrolls the page to ensure that all elements are loaded and visible.
     * 
     * @returns A promise that resolves when the scrolling is complete.
     */
    public async scrollPage(): Promise<void> {
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

    /**
     * Enters text into the specified input element, clearing any existing text if necessary.
     * 
     * @param element The web element where the text should be entered.
     * @param text The text to enter into the element.
     * @returns A promise that resolves when the text has been entered.
     */
    public async enterText(element: WebElement, text: string): Promise<void> {
        const currentValue = await element.getAttribute('value');
        if (currentValue !== text) {
            await element.clear();
            await sleepRandom(500, 1500);
            await element.sendKeys(text);
        } else {
            await this.logger.info(`Skipping text input for element with current value: ${currentValue}`);
        }
    }

    /**
     * Checks if the specified form element is already filled.
     * 
     * @param element The web element to check.
     * @returns A promise that resolves to true if the element is already filled, false otherwise.
     */
    public async isElementAlreadyFilled(element: WebElement): Promise<boolean> {
        const tagName = await element.getTagName();
        const type = await element.getAttribute('type');

        if (tagName === 'input') {
            if (type === 'radio' || type === 'checkbox') {
                return await element.isSelected();
            } else {
                const value = await element.getAttribute('value');
                return value !== null && value !== '';
            }
        } else if (tagName === 'select') {
            const selectedOption = await element.findElement(By.css('option:checked'));
            const value = await selectedOption.getAttribute('value');
            return value !== '' && value !== 'default';
        } else if (tagName === 'textarea') {
            const value = await element.getAttribute('value');
            return value !== null && value !== '';
        }

        return false;
    }

    /**
     * Determines if the specified input field is numeric based on its attributes.
     * 
     * @param field The web element to check.
     * @returns A promise that resolves to true if the field is numeric, false otherwise.
     */
    public async isNumericField(field: WebElement): Promise<boolean> {
        const fieldType = (await field.getAttribute('type')).toLowerCase();
        if (fieldType.includes('numeric')) return true;
        const classAttribute = await field.getAttribute("id");
        return Boolean(classAttribute && classAttribute.toLowerCase().includes('number'));
    }

    /**
     * Generates a unique identifier for the specified web element based on its attributes.
     * 
     * @param element The web element for which to generate a unique identifier.
     * @returns A promise that resolves to a string representing the unique identifier.
     */
    public async getUniqueElementIdentifier(element: WebElement): Promise<string> {
        const id = await element.getAttribute('id');
        if (id) return id;

        const name = await element.getAttribute('name');
        if (name) return name;

        const classes = await element.getAttribute('class');
        const type = await element.getAttribute('type');
        const text = await element.getText();
        return `${classes}-${type}-${text}`.replace(/\s+/g, '-');
    }
}

export { ElementUtilities };
