#!/usr/bin/env node
import * as dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../.env' });
const { env } = process;
const isDebug = Boolean(env.DEBUG);

import { Browser } from './browser';
import { AWS_CREDENTIALS_FILE_PATH, selectAwsProfile, setAwsCredentials } from './aws';
import chalk from 'chalk';

(async () => {
  const browser = new Browser(isDebug);
  await browser.init();
  await browser.authenticate();

  const profiles = await browser.fetchAwsProfiles();
  const selectedProfile = await selectAwsProfile(profiles);

  const credentials = await browser.fetchCredentials(selectedProfile.profileId);
  await setAwsCredentials(credentials);

  console.info(
    `\nSuccessfully set AWS credentials for profile ${chalk.yellow(selectedProfile.profileName)} to ${chalk.gray(
      AWS_CREDENTIALS_FILE_PATH
    )}`
  );

  await browser.close();
})();
