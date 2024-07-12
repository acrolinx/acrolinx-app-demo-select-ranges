import webdriver, { By, WebElement } from 'selenium-webdriver';

export class SeleniumSidebarDriver {
  constructor(
    private driver: webdriver.ThenableWebDriver,
    private sidebarIFrame: WebElement,
  ) {}

  public switchTo(): Promise<void> {
    return this.driver.switchTo().frame(this.sidebarIFrame);
  }

  public async gotoAbout() {
    await this.driver.findElement(By.className('icon-menu')).click();
    await this.driver.findElement(By.className('icon-about')).click();
  }

  public aboutPage = {
    findValueForSoftwareComponentLabel: async (softwareComponentLabel: string) => {
      const versionElementLocator = By.xpath(
        `//div[@class="about-tab-label" and text()="${softwareComponentLabel}"]/following-sibling::div`,
      );
      return await this.driver.findElement(versionElementLocator).getText();
    },
  };

  async gotoAppTab(appId: string) {
    const selectRangesTabHeader = await this.driver.findElement(By.id(appId));
    await this.driver.sleep(500);
    await selectRangesTabHeader.click();
  }

  async switchToAppIFrame() {
    const appIframe = await this.driver.findElement(By.css(`.tab-content--active.selectRangesTab iframe`));
    await this.driver.switchTo().frame(appIframe);
  }

  async gotoIssuesTab() {
    await this.driver.findElement(By.css(`.icon-canCheck`)).click();
  }

  async clickButton(buttonText: string) {
    return this.driver.findElement(By.xpath(`//button[text() = "${buttonText}"]`)).click();
  }

  async clickSuggestion(suggestionText: string) {
    return this.driver
      .findElement(By.xpath(`//button[@class="suggestionLabel" and text() = "${suggestionText}"]`))
      .click();
  }
}
