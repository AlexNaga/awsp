#!/usr/bin/env node
import * as dotenv from 'dotenv';
import { AWS_CREDENTIALS_FILE_PATH, selectAwsProfile, setAwsCredentials } from './aws';
dotenv.config({ path: __dirname + '/../.env' });
const { env } = process;

import { BrowserHandler } from './browser';

(async () => {
  const browser = new BrowserHandler(Boolean(env.DEBUG));
  await browser.init();
  await browser.authenticate();

  const profiles = await browser.fetchAwsProfiles();
  const selectedProfile = await selectAwsProfile(profiles);

  const credentials = await browser.fetchCredentials(selectedProfile.profileId);
  await setAwsCredentials(credentials);

  console.info(
    `Successfully set AWS credentials for profile "${selectedProfile.profileName}" to ${AWS_CREDENTIALS_FILE_PATH}`
  );

  await browser.close();
})();
