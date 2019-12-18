import chromedriver from 'chromedriver';
import * as dotenv from 'dotenv';
import fs from 'fs';
import webdriver from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

const By = webdriver.By;
chrome.setDefaultService(new chrome.ServiceBuilder(chromedriver.path).build());

dotenv.config();

const ACROLINX_API_TOKEN = process.env.ACROLINX_API_TOKEN;
const TEST_SERVER_URL = process.env.TEST_SERVER_URL;

const TIMEOUT_MS = 20_000;

describe('live demo', () => {
  const TEST_TEXT = 'This textt has an problemm.';

  let driver: webdriver.ThenableWebDriver;
  jest.setTimeout(TIMEOUT_MS);

  beforeEach(async () => {
    if (!fs.existsSync('./tmp')){
      fs.mkdirSync('./tmp');
    }

    driver = new webdriver.Builder()
      .forBrowser('chrome')
      .setChromeOptions(new chrome.Options().headless())
      .build();
    driver.manage().setTimeouts({implicit: TIMEOUT_MS / 2});

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

  afterEach(() => {
    driver.close();
    driver.quit();
  });

  it('select ranges app and extract text', async () => {
    await driver.sleep(500);
    await driver.findElement(By.id('selectRanges')).click();

    const screenShotBase64Encoded = await driver.takeScreenshot();
    fs.writeFileSync('tmp/before-extract-text.png', screenShotBase64Encoded, 'base64');

    driver.findElement(By.xpath('//button[text() = "EXTRACT TEXT"]')).click();

    const appIframe = driver.findElement(By.css('.tab-content--active.selectRangesTab iframe'));
    driver.switchTo().frame(appIframe);

    await driver.sleep(500);
    const appMainElement = driver.findElement(By.css('main'));
    expect(await appMainElement.getText()).toEqual(TEST_TEXT);
  });

});
