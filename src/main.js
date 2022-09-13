#! /usr/bin/env node
require('dotenv').config({ path: __dirname + '/../.env' });
const { env } = process;

const { AWS_CREDENTIALS_FILE_PATH, formatAwsCredentials, selectAwsProfile, setAwsCredentials } = require('./aws');
const { getUserInput } = require('./input');
const { BrowserHandler } = require('./browser');

(async () => {
  try {
    const debug = env.PPTR_DEBUG === 'true';
    if (debug) console.time('debug-timer');

    let mfaCode;
    while (!mfaCode || mfaCode.length !== 6) {
      mfaCode = await getUserInput('Enter MFA code: ');
    }

    const browser = new BrowserHandler({ debug });
    await browser.init();

    await browser.authenticate(mfaCode);

    const profiles = await browser.fetchAwsProfiles();
    const selectedProfile = await selectAwsProfile(profiles);

    const rawCredentials = await browser.fetchCredentials(selectedProfile.profileId);
    const credentials = formatAwsCredentials(rawCredentials);
    setAwsCredentials(credentials);

    console.info(
      `Successfully set AWS credentials for profile "${selectedProfile.profileName}" to ${AWS_CREDENTIALS_FILE_PATH}`
    );

    await browser.close();
    if (debug) console.timeEnd('debug-timer');
  } catch (error) {
    console.error(error.message);
  }
})();
