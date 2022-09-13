const { env } = process;
const puppeteer = require('puppeteer-extra');
const path = require('path');

const showBrowserLogs = (page) =>
  page.on('console', async (msg) => {
    try {
      console[msg._type](...(await Promise.all(msg.args().map((arg) => arg.jsonValue()))));
    } catch (error) {}
  });

const waitForRequestWithUrlPath = (page, urlPath) => page.waitForRequest((request) => request.url().includes(urlPath));

const getBrowserClipboard = (page) => page.evaluate(() => navigator.clipboard.readText());

const isAuthenticated = async (page) => {
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    const accountMenuSelector = 'portal-application';
    return Boolean(await page.waitForSelector(accountMenuSelector, { timeout: 1000 }));
  } catch (error) {
    return false;
  }
};

const authenticate = async ({ page, mfaCode }) => {
  const awsPreLoginUrl = 'https://eu-north-1.signin.aws/platform/api/execute'; // a static URL which is requested when we can input username and password
  const awsLoginDoneUrl = 'https://portal.sso.eu-north-1.amazonaws.com/token/whoAmI'; // a static URL which is requested after we input the MFA code

  const emailInputSelector = '#username-input';
  await page.waitForSelector(emailInputSelector);
  await page.type(emailInputSelector, env.USER_EMAIL);
  await page.keyboard.press('Enter');

  await page.waitForResponse(awsPreLoginUrl);

  const passwordInputSelector = '#awsui-input-1';
  await page.waitForSelector(passwordInputSelector);
  await page.type(passwordInputSelector, env.USER_PASSWORD);
  await page.keyboard.press('Enter');

  const mfaInputSelector = '#awsui-input-0';
  await page.waitForSelector(mfaInputSelector);
  await page.type(mfaInputSelector, mfaCode);
  await page.keyboard.press('Enter');

  await page.waitForResponse(awsLoginDoneUrl);

  await page.waitForNavigation({ waitUntil: 'networkidle0' });
};

const fetchAwsProfiles = async (page) => {
  const profileMenuSelector = 'portal-application';
  await page.waitForSelector(profileMenuSelector);
  await page.click(profileMenuSelector);

  const profileListElem = 'portal-instance';
  await page.waitForSelector(profileListElem);

  // get all profile names and IDs
  return page.$$eval(profileListElem, (profileList) =>
    profileList.map((elem) => {
      const profileName = elem.querySelector('.name').textContent;
      const profileId = elem.querySelector('.accountId').textContent.replace('#', '');

      return { profileName, profileId };
    })
  );
};

const fetchCredentials = async ({ page, awsAccountId }) => {
  const profileListElem = 'portal-instance';
  await page.waitForSelector(profileListElem);

  // click on matching account ID in list
  await page.$$eval(
    `${profileListElem} .accountId`,
    (accountsElem, awsAccountId) => {
      const accountElem = accountsElem.find((elem) => elem.textContent === `#${awsAccountId}`);
      if (!accountElem) throw new Error(`Account not found: ${awsAccountId}`);
      accountElem.click();
    },
    awsAccountId
  );

  await waitForRequestWithUrlPath(page, '/log'); // this makes sure that the data is loaded

  // TODO: wait for this in a better way
  await page.waitForTimeout(1000);

  const openCredentialsSelector = '#temp-credentials-button';
  await page.waitForSelector(openCredentialsSelector);
  await page.click(openCredentialsSelector);

  // TODO: wait for this in a better way
  await page.waitForTimeout(1000);

  const copyCredentialsSelector = '#hover-copy-env';
  await page.waitForSelector(copyCredentialsSelector);
  await page.click(copyCredentialsSelector);

  return getBrowserClipboard(page);
};

const blockResources = (pptr) =>
  pptr.use(
    require('puppeteer-extra-plugin-block-resources')({
      blockedTypes: new Set(['image', 'media', 'font', 'texttrack', 'eventsource', 'websocket', 'manifest']),
    })
  );

class BrowserHandler {
  constructor({ debug = false }) {
    this.debug = debug;
  }

  async init() {
    blockResources(puppeteer);
    this.browser = await puppeteer.launch({ headless: !this.debug, userDataDir: `${path.join(__dirname, '../.tmp')}` });
    const context = this.browser.defaultBrowserContext();
    context.overridePermissions(env.AWS_URL, ['clipboard-read']); // allow clipboard access

    this.page = await this.browser.newPage();
    if (this.debug) await showBrowserLogs(this.page);
    await this.page.goto(env.AWS_URL);
  }

  async isAuthenticated() {
    console.info('Checking if authenticated...');
    return isAuthenticated(this.page);
  }

  async authenticate(mfaCode) {
    console.info('Authenticating...');
    await authenticate({ page: this.page, mfaCode });
  }

  async fetchAwsProfiles() {
    console.info('Fetching AWS profiles...');
    return fetchAwsProfiles(this.page);
  }

  async fetchCredentials(awsAccountId) {
    console.info('Fetching credentials...');
    return fetchCredentials({ page: this.page, awsAccountId });
  }

  async close() {
    await this.browser.close();
  }
}

module.exports.BrowserHandler = BrowserHandler;
