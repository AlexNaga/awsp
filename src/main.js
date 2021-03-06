#! /usr/bin/env node
require('dotenv').config({ path: __dirname + '/../.env' });
const { env } = process;

const {
  getAwsProfileName,
  getAwsAccountId,
  setAwsCredentials,
  formatAwsCredentials,
  AWS_CREDENTIALS_FILE_PATH,
} = require('./aws');
const { getUserInput } = require('./input');
const { BrowserHandler } = require('./browser');

(async () => {
  try {
    const awsProfileName = getAwsProfileName();
    const awsAccountId = getAwsAccountId(awsProfileName);
    const debug = env.PPTR_DEBUG === 'true';
    if (debug) console.time('debug-timer');

    let mfaCode;
    while (!mfaCode || mfaCode.length !== 6) {
      mfaCode = await getUserInput('Enter MFA code: ');
    }

    const browser = new BrowserHandler({ awsAccountId, debug });
    await browser.init();

    await browser.authenticate(mfaCode);

    const rawCredentials = await browser.fetchCredentials();
    const credentials = formatAwsCredentials(rawCredentials);
    setAwsCredentials(credentials);

    console.info(`Successfully set AWS credentials for profile "${awsProfileName}" to ${AWS_CREDENTIALS_FILE_PATH}`);

    await browser.close();
    if (debug) console.timeEnd('debug-timer');
  } catch (error) {
    console.error(error.message);
  }
})();
