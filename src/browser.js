const { env } = process;
const puppeteer = require('puppeteer');

const showBrowserLogs = (page) =>
  page.on('console', async (msg) => {
    try {
      console[msg._type](...(await Promise.all(msg.args().map((arg) => arg.jsonValue()))));
    } catch (error) {}
  });

const waitForRequestWithUrlPath = (page, urlPath) => page.waitForRequest((request) => request.url().includes(urlPath));

const getBrowserClipboard = (page) => page.evaluate(() => navigator.clipboard.readText());

const authenticate = async ({ page, mfaCode }) => {
  const microsoftLoginStatusUrl = 'https://login.microsoftonline.com/common/instrumentation/dssostatus'; // a static URL which is requested when we can input username and password
  const microsoftLoginEndUrl = 'https://login.microsoftonline.com/common/SAS/EndAuth'; // a static URL which is requested after we input the MFA code
  await page.waitForResponse(microsoftLoginStatusUrl);

  const emailInputSelector = 'input[name="loginfmt"]';
  await page.waitForSelector(emailInputSelector);
  await page.type(emailInputSelector, env.USER_EMAIL);
  await page.keyboard.press('Enter');

  await page.waitForResponse(microsoftLoginStatusUrl);

  const passwordInputSelector = 'input[name="passwd"]';
  await page.waitForSelector(passwordInputSelector);
  await page.type(passwordInputSelector, env.USER_PASSWORD);
  await page.keyboard.press('Enter');

  const mfaInputSelector = 'input[name="otc"]';
  await page.waitForSelector(mfaInputSelector);
  await page.type(mfaInputSelector, mfaCode);
  await page.keyboard.press('Enter');

  await page.waitForResponse(microsoftLoginEndUrl);
};

const fetchCredentials = async ({ page, awsAccountId }) => {
  const loginBtnSelector = 'input[type="submit"]';
  await page.waitForSelector(loginBtnSelector);
  await page.keyboard.press('Enter');

  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  const accountMenuSelector = 'portal-application';
  await page.waitForSelector(accountMenuSelector);
  await page.click(accountMenuSelector);

  const allAwsAccountsSelector = 'portal-instance';
  await page.waitForSelector(allAwsAccountsSelector);

  // click on matching account ID in list
  await page.$$eval(
    `${allAwsAccountsSelector} .accountId`,
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

module.exports.browser = async ({ mfaCode, awsAccountId }) => {
  const browser = await puppeteer.launch({ headless: true });
  const context = browser.defaultBrowserContext();
  context.overridePermissions(env.AWS_URL, ['clipboard-read']); // allow clipboard access

  const page = await browser.newPage();
  // await showBrowserLogs(page);
  await page.goto(env.AWS_URL);

  console.info('Authenticating...');
  await authenticate({ page, mfaCode });

  console.info('Fetching credentials...');
  const rawCredentials = await fetchCredentials({ page, awsAccountId });

  await browser.close();
  return { rawCredentials };
};
