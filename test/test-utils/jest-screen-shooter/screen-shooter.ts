import fsExtra from 'fs-extra';
import path from 'path';
import webdriver from 'selenium-webdriver';
//import jasmine from 'jasmine';

const Jasmine = require('jasmine');
const jasmine = new Jasmine();

export const SCREENSHOT_FOLDER = 'tmp/screenshots';

interface CurrentTest {
  fullName: string;
  failedExpectations: unknown[];
}

export class ScreenShooter {
  static currentTest: CurrentTest | undefined;
  counter = 0;

  public static initJasmineReporter() {
    fsExtra.removeSync(SCREENSHOT_FOLDER);

    jasmine.jasmine.getEnv().addReporter({
      specStarted: (result?: CurrentTest) => {
        ScreenShooter.currentTest = result;
      },
      specDone: (result?: CurrentTest) => {
        ScreenShooter.currentTest = result;
      },
    });
  }

  constructor(private webdriver: webdriver.ThenableWebDriver) {
    fsExtra.mkdirpSync(SCREENSHOT_FOLDER);
  }

  /**
   * Call this method whenever you want to save a screenshot.
   * Folder, count and testName is prepended to the name.
   */
  async shoot(name: string) {
    const testName = ScreenShooter.currentTest?.fullName ?? 'unknown_test';
    const screenShotAfterExtractBase64Encoded = await this.webdriver.takeScreenshot();
    const fileNameBase = `${testName}_${(this.counter)}_${name}`.replace(' ', '_');
    this.counter += 1;
    fsExtra.writeFileSync(path.join(SCREENSHOT_FOLDER, fileNameBase + '.png'), screenShotAfterExtractBase64Encoded, 'base64');
  }

  /**
   * Call this method in afterEach.
   */
  async shootAfterEach() {
    const failedExpectations = ScreenShooter.currentTest?.failedExpectations;
    if (failedExpectations && failedExpectations.length > 0) {
      await this.shoot('failed');
    } else {
      await this.shoot('succeeded');
    }
  }
}
