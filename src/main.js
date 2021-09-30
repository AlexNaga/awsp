#! /usr/bin/env node

const { formatAwsCredentials, getAwsAccountId, setAwsCredentials, AWS_CREDENTIALS_FILE_PATH } = require('./aws');
const { getUserInput } = require('./input');
const { browser } = require('./browser');

(async () => {
  try {
    const awsProfileName = process.argv[2];
    if (!awsProfileName) throw new Error('You need to pass in an AWS config profile name.');

    const awsAccountId = getAwsAccountId(awsProfileName);
    const mfaCode = await getUserInput('Enter MFA code: ');

    const { rawCredentials } = await browser({ mfaCode, awsAccountId });

    const credentials = formatAwsCredentials(rawCredentials);
    setAwsCredentials(credentials);

    console.info(`Successfully set AWS credentials for profile "${awsProfileName}" to ${AWS_CREDENTIALS_FILE_PATH}`);
  } catch (error) {
    console.error(error.message);
  }
})();
