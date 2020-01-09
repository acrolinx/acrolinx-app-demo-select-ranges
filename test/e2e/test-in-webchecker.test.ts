import chromedriver from 'chromedriver';
import * as dotenv from 'dotenv';
import webdriver from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import packageJson from '../../package.json';
import {ScreenShooter} from '../jest-screen-shooter/screen-shooter';

const By = webdriver.By;
chrome.setDefaultService(new chrome.ServiceBuilder(chromedriver.path).build());

dotenv.config();

const ACROLINX_API_TOKEN = process.env.ACROLINX_API_TOKEN;
const TEST_SERVER_URL = process.env.TEST_SERVER_URL;
const TEST_HEADLESS = process.env.TEST_HEADLESS !== 'false';

const TIMEOUT_MS = 20_000;

describe('live demo', () => {
  const TEST_TEXT = 'This textt has an problemm.';

  let driver: webdriver.ThenableWebDriver;
  let screenShooter: ScreenShooter;
  jest.setTimeout(TIMEOUT_MS);

  beforeEach(async () => {
    const chromeOptions = new chrome.Options();
    if (TEST_HEADLESS) {
      chromeOptions.headless();
    }

    driver = new webdriver.Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .build();
    driver.manage().setTimeouts({implicit: TIMEOUT_MS / 2});

    screenShooter = new ScreenShooter(driver);

    if (!ACROLINX_API_TOKEN || !TEST_SERVER_URL) {
      throw new Error('Please configure env variables ACROLINX_API_TOKEN and TEST_SERVER_URL!');
    }

    await driver.get(TEST_SERVER_URL + '/webchecker/index.html?text=' + TEST_TEXT);
    await driver.executeScript(`localStorage.setItem('acrolinx.sidebar.authtokens', arguments[0])`,
      JSON.stringify({[TEST_SERVER_URL]: ACROLINX_API_TOKEN}));

    const webCheckerIframe = driver.findElement(By.css('#webchecker iframe'));
    driver.switchTo().frame(webCheckerIframe);
    const sidebarIFrame = driver.findElement(By.css('#sidebarContainer iframe'));
    await driver.switchTo().frame(sidebarIFrame);
  });

  afterEach(async () => {
    await screenShooter.shootAfterEach();
    await driver.close();
    await driver.quit();
  });

  it('verify version in about tab', async () => {
    await driver.findElement(By.className('icon-menu')).click();
    await driver.findElement(By.className('icon-about')).click();
    const versionElementLocator = By.xpath('//div[@class="about-tab-label" and text()="Select Ranges"]/following-sibling::div');
    const aboutItemVersion = await driver.findElement(versionElementLocator).getText();
    expect(aboutItemVersion).toEqual(packageJson.version);
  });

  describe('select ranges app and extract text', () => {
    beforeEach(async () => {
      const selectRangesTabHeader = await driver.findElement(By.id('selectRanges'));
      await driver.sleep(500);
      await selectRangesTabHeader.click();

      await screenShooter.shoot('before-extract-text');

      driver.findElement(By.xpath('//button[text() = "EXTRACT TEXT"]')).click();

      const appIframe = driver.findElement(By.css('.tab-content--active.selectRangesTab iframe'));
      driver.switchTo().frame(appIframe);

      await driver.wait(driver.findElement(By.className('marking')));
      await screenShooter.shoot('after-extract-text');
    });

    it('display the extracted text', async () => {
      const appMainElement = driver.findElement(By.css('main'));
      expect(await appMainElement.getText()).toEqual(TEST_TEXT);
    });

    it('select ranges in the editor', async () => {
      const appMainElement = driver.findElement(By.css('main'));
      expect(await appMainElement.getText()).toEqual(TEST_TEXT);
    });
  });
});
