import chromedriver from 'chromedriver';
import * as dotenv from 'dotenv';
import webdriver from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import packageJson from '../package.json';
import { INVALID_MARKING_CSS_CLASS, MARKING_CSS_CLASS } from '../src/markings';
import { ScreenShooter } from './test-utils/jest-screen-shooter/screen-shooter';
import { SeleniumSidebarDriver } from './test-utils/selenium-sidebar-driver';
import { SeleniumWebCheckerDriver } from './test-utils/selenium-webchecker-driver';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

const By = webdriver.By;

dotenv.config();

const ACROLINX_API_TOKEN = process.env.ACROLINX_API_TOKEN;
const TEST_SERVER_URL = process.env.TEST_SERVER_URL;
const TEST_HEADLESS = process.env.TEST_HEADLESS !== 'false';

const TIMEOUT_MS = 20_000;

const MARKING_LOCATOR = By.className(MARKING_CSS_CLASS);
const APP_ID = 'selectRanges';

describe('live demo', () => {
  const TEST_TEXT = 'This textt has an problemm.';
  const WORDS = TEST_TEXT.split(/[\s.,:"]+/g).filter((it) => it !== '');

  let driver: webdriver.ThenableWebDriver;
  let screenShooter: ScreenShooter;
  let webChecker: SeleniumWebCheckerDriver;
  let sidebar: SeleniumSidebarDriver;

  beforeEach(async () => {
    const chromeOptions = new chrome.Options();
    chromeOptions.addArguments('--disable-web-security');
    if (process.env.CHROME_BIN_PATH) {
      console.log(`Chrome Binary path: ${process.env.CHROME_BIN_PATH}`);
      chromeOptions.setBinaryPath(process.env.CHROME_BIN_PATH);
    }
    if (TEST_HEADLESS) {
      chromeOptions.addArguments('--headless=new');
    }

    driver = new webdriver.Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .setChromeService(new chrome.ServiceBuilder(chromedriver.path))
      .build();
    driver.manage().setTimeouts({ implicit: TIMEOUT_MS / 2 });

    screenShooter = new ScreenShooter(driver);

    if (!ACROLINX_API_TOKEN || !TEST_SERVER_URL) {
      throw new Error('Please configure env variables ACROLINX_API_TOKEN and TEST_SERVER_URL!');
    }

    webChecker = await SeleniumWebCheckerDriver.open(driver, TEST_SERVER_URL, ACROLINX_API_TOKEN, TEST_TEXT);
    await webChecker.switchTo();

    sidebar = new SeleniumSidebarDriver(driver, webChecker.getSidebarIFrame());

    /* Sidebar can take some time to render completely */
    await driver.sleep(5000);

    await sidebar.switchTo();
  });

  afterEach(async () => {
    await screenShooter.shootAfterEach();
    await driver.close();
    await driver.quit();
  });

  test('verify version in about tab', async () => {
    await sidebar.gotoAbout();
    const version = await sidebar.aboutPage.findValueForSoftwareComponentLabel('Select Ranges');
    expect(version).toEqual(packageJson.version);
  });

  describe('after text extraction', () => {
    beforeEach(async () => {
      await sidebar.gotoAppTab(APP_ID);
      await screenShooter.shoot('before-extract-text');
      await sidebar.clickButton('EXTRACT TEXT');
      await sidebar.switchToAppIFrame();

      await driver.wait(driver.findElement(MARKING_LOCATOR));
      await screenShooter.shoot('after-extract-text');
    });

    test('display the extracted text', async () => {
      const markingsParent = await driver.findElement(MARKING_LOCATOR).findElement(By.xpath('..'));
      const text = await markingsParent.getText();
      console.log(text);
      console.log(TEST_TEXT);
      expect(text).toEqual(TEST_TEXT);
    });

    test('select ranges in the editor', async () => {
      const wordElements = await driver.findElements(MARKING_LOCATOR);
      expect(await wordElements[1].getText()).toEqual(WORDS[1]);
      await wordElements[1].click();

      await webChecker.switchTo();
      expect(await webChecker.getSelectedText()).toEqual(WORDS[1]);
    });

    test('replace a words in the editor', async () => {
      const wordElements = await driver.findElements(MARKING_LOCATOR);
      const secondWordElement = wordElements[1];

      expect(await secondWordElement.getText()).toEqual(WORDS[1]);

      await driver.actions().doubleClick(secondWordElement).perform();
      expect(await secondWordElement.getAttribute('class')).toContain(INVALID_MARKING_CSS_CLASS);

      await webChecker.switchTo();
      expect(await webChecker.getSelectedText()).toEqual('TEXTT!');
      expect(await webChecker.getText()).toEqual(TEST_TEXT.replace(WORDS[1], 'TEXTT!'));
    });

    test('replace all words in the editor', async () => {
      const wordElements = await driver.findElements(MARKING_LOCATOR);
      let text = TEST_TEXT;

      expect(wordElements.length).toEqual(WORDS.length);

      for (let i = 0; i < wordElements.length; i++) {
        await webChecker.switchTo();
        await sidebar.switchTo();
        await sidebar.switchToAppIFrame();

        const word = WORDS[i];
        const wordElement = wordElements[i];
        expect(await wordElement.getText()).toEqual(word);

        expect(await wordElement.getAttribute('class')).not.toContain(INVALID_MARKING_CSS_CLASS);
        await driver.actions().doubleClick(wordElement).perform();
        expect(await wordElement.getAttribute('class')).toContain(INVALID_MARKING_CSS_CLASS);

        await webChecker.switchTo();

        const replacement = word.toUpperCase() + '!';
        expect(await webChecker.getSelectedText()).toEqual(replacement);

        text = text.replace(word, replacement);
        expect(await webChecker.getText()).toEqual(text);
      }

      expect(text).toEqual('THIS! TEXTT! HAS! AN! PROBLEMM!.');
    });

    test('Applying an issue suggestion should invalidate the corresponding ranges in the app', async () => {
      await webChecker.switchTo();
      await sidebar.switchTo();
      await sidebar.gotoIssuesTab();

      await sidebar.clickButton('CHECK');
      await sidebar.clickSuggestion('text');

      await sidebar.gotoAppTab(APP_ID);
      await sidebar.switchToAppIFrame();
      const wordElements = await driver.findElements(MARKING_LOCATOR);
      expect(await wordElements[0].getAttribute('class')).not.toContain(INVALID_MARKING_CSS_CLASS);
      expect(await wordElements[1].getAttribute('class')).toContain(INVALID_MARKING_CSS_CLASS);
      expect(await wordElements[2].getAttribute('class')).not.toContain(INVALID_MARKING_CSS_CLASS);
    });
  });
});
