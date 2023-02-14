#!/usr/bin/env node
import path from 'path'
import { dirname } from 'dirname-filename-esm'
const __dirname = dirname(import.meta)
import * as dotenv from 'dotenv'
dotenv.config({ path: path.join(__dirname, '../.env') })
const { env } = process

import { Browser } from './Browser.js'
import {
  AWS_CREDENTIALS_FILE_PATH,
  selectAwsProfile,
  setAwsCredentials,
  setLastSelectedProfile,
} from './helpers/aws.js'
import chalk from 'chalk'
;(async () => {
  const browser = new Browser()
  await browser.init()
  await browser.authenticate()

  const profiles = await browser.fetchAwsProfiles()
  const selectedProfile = await selectAwsProfile(profiles)
  await setLastSelectedProfile(selectedProfile.profileName)

  const credentials = await browser.fetchCredentials(selectedProfile.profileId)
  await setAwsCredentials(credentials)

  console.info(
    `\nSuccessfully set AWS credentials for profile ${chalk.yellow(selectedProfile.profileName)} to ${chalk.gray(
      AWS_CREDENTIALS_FILE_PATH
    )}`
  )

  if (env.UPDATE_WSL_AWS_CREDENTIALS) {
    console.info(
      `\nSuccessfully set WSL AWS credentials for profile ${chalk.yellow(selectedProfile.profileName)} to ${chalk.gray(
        `${env.WSL_HOME_DIR_PATH}/.aws/credentials`
      )}`
    )
  }

  await browser.close()
})()
