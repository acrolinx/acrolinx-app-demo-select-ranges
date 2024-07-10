import webdriver, {By, WebElement, WebElementPromise} from 'selenium-webdriver';

export class SeleniumWebCheckerDriver {
  private constructor(private driver: webdriver.ThenableWebDriver, private webCheckerIFrame: WebElement) {
  }

  static async open(driver: webdriver.ThenableWebDriver, acrolinxUrl: string, apiToken: string, text: string): Promise<SeleniumWebCheckerDriver> {
    await driver.get(acrolinxUrl + '/webchecker/index.html?text=' + text);
    await driver.executeScript(`localStorage.setItem('acrolinx.sidebar.authtokens', arguments[0])`,
      JSON.stringify({[acrolinxUrl]: apiToken}));
    const webCheckerIFrame = await driver.findElement(By.css('#webchecker iframe'));
    return new SeleniumWebCheckerDriver(driver, webCheckerIFrame);
  }

  public async switchTo(): Promise<void> {
    await this.driver.switchTo().defaultContent();
    await this.driver.switchTo().frame(this.webCheckerIFrame);
  }

  getSidebarIFrame(): WebElementPromise {
    return this.driver.findElement(By.css('#sidebarContainer iframe'))
  }

  async getSelectedText() {
    return this.driver.executeScript(() => getSelection()?.toString())
  }

  async getText(): Promise<string> {
    const textarea = await this.driver.findElement(By.id('editor'));
    return textarea.getAttribute('value');
  }
}
