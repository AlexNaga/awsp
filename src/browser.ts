import path from 'path';
import { BrowserContext } from 'playwright';
import { chromium, Page } from 'playwright-core';
import { formatAwsCredentials } from './aws';
import { getUserInput } from './input';
import { AwsProfile } from './models/AwsProfile';
import { Credentials } from './models/Credentials';

const { env } = process;

const getBrowserClipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText());

const isAuthenticated = async (page: Page) => {
  try {
    await page.locator('portal-application').waitFor({ timeout: 1000 });
    // eslint-disable-next-line no-empty
  } catch (error) {}
  return page.locator('portal-application').isVisible();
};

const authenticate = async (page: Page, mfaCode: string) => {
  await page.locator('#username-input').type(env.USER_EMAIL);
  await page.keyboard.press('Enter');

  await page.locator('#password-input').type(env.USER_PASSWORD);
  await page.keyboard.press('Enter');

  await page.locator('input[type="text"]').fill(mfaCode);
  await page.keyboard.press('Enter');
};

const fetchAwsProfiles = async (page: Page): Promise<AwsProfile[]> => {
  await page.locator('portal-application').click();
  await page.locator('sso-expander').isVisible();

  const profileList = await page.$$('portal-instance');

  // get all profile names and IDs
  return Promise.all(
    profileList.map(async (elem) => {
      const profileName = await (await elem.$('.name'))?.textContent();
      const profileId = (await (await elem.$('.accountId'))?.textContent())?.replace('#', '');

      if (!profileName) throw new Error('Error: profileName is not defined');
      if (!profileId) throw new Error('Error: profileId is not defined');

      return { profileName, profileId };
    })
  );
};

const fetchCredentials = async (page: Page, awsProfileId: string) => {
  const profilesSelector = 'portal-instance';
  await page.waitForSelector(profilesSelector);

  await page.locator(`text=${awsProfileId}`).click();
  await page.waitForTimeout(1000);

  await page.locator('#temp-credentials-button').click();
  await page.locator('#hover-copy-env').click();

  return getBrowserClipboard(page);
};

export class BrowserHandler {
  debug = false;
  browser!: BrowserContext;
  page!: Page;

  constructor(debug = false) {
    this.debug = debug;
  }

  async init() {
    const userDataDir = `${path.join(__dirname, '../.tmp')}`;
    this.browser = await chromium.launchPersistentContext(userDataDir, { headless: !this.debug });

    // allow clipboard access
    this.browser.grantPermissions(['clipboard-read'], { origin: env.AWS_URL });

    this.page = await this.browser.newPage();
    await this.page.goto(env.AWS_URL);
  }

  async isAuthenticated() {
    console.info('Checking if authenticated...');
    return isAuthenticated(this.page);
  }

  async authenticate() {
    // check if active login session
    if (!(await this.isAuthenticated())) {
      let mfaCode = '';

      while (!mfaCode || mfaCode.length !== 6) {
        mfaCode = await getUserInput('Enter MFA code: ');
      }

      console.info('Authenticating...');
      await authenticate(this.page, mfaCode);
    }
  }

  async fetchAwsProfiles() {
    console.info('Fetching AWS profiles...');
    return fetchAwsProfiles(this.page);
  }

  async fetchCredentials(awsProfileId: string): Promise<Credentials> {
    console.info('Fetching credentials...');
    const rawCredentials = await fetchCredentials(this.page, awsProfileId);
    return formatAwsCredentials(rawCredentials);
  }

  async close() {
    await this.browser.close();
  }
}
