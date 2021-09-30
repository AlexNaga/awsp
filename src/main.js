#! /usr/bin/env node

const {
  formatAwsCredentials,
  getAwsConfig,
  setAwsCredentials,
  AWS_CONFIG_FILE_PATH,
  AWS_CREDENTIALS_FILE_PATH,
} = require('./aws');
const { getUserInput } = require('./input');
const { browser } = require('./browser');

(async () => {
  try {
    const awsProfileName = process.argv[2];
    if (!awsProfileName) throw new Error('You need to pass in an AWS config profile name.');

    const awsConfig = getAwsConfig();
    const awsProfile = awsConfig[`profile ${awsProfileName}`];
    if (!awsProfile) throw new Error(`The AWS profile "${awsProfile}" couldn't be found in ${AWS_CONFIG_FILE_PATH}`);

    const awsAccountId = awsProfile.role_arn.split(':')[4];
    const mfaCode = await getUserInput('Enter MFA code: ');

    console.info('Authenticating...');
    const { rawCredentials } = await browser({ mfaCode, awsAccountId });

    const credentials = formatAwsCredentials(rawCredentials);
    setAwsCredentials(credentials);

    console.info(`Successfully set AWS credentials for profile "${awsProfileName}" to ${AWS_CREDENTIALS_FILE_PATH}`);
  } catch (error) {
    console.error(error.message);
  }
})();
