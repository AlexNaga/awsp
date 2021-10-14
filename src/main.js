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

    let mfaCode;
    while (mfaCode?.length !== 6) mfaCode = await getUserInput('Enter MFA code: ');

    const browser = new BrowserHandler({ mfaCode, awsAccountId, debug });
    await browser.init();
    await browser.authenticate();

    const rawCredentials = await browser.fetchCredentials();
    const credentials = formatAwsCredentials(rawCredentials);
    setAwsCredentials(credentials);

    console.info(`Successfully set AWS credentials for profile "${awsProfileName}" to ${AWS_CREDENTIALS_FILE_PATH}`);

    await browser.close();
  } catch (error) {
    console.error(error.message);
  }
})();
