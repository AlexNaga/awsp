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
import { AwsCredentials } from './models/AwsCredentials.js'
;(async () => {
  const usePrivateAccount = process.argv[2] === 'p' || process.argv[2] === 'profile'
  let credentials: AwsCredentials = {
    accessKeyId: env.PRIVATE_USER_ACCESS_KEY ?? '',
    secretAccessKey: env.PRIVATE_USER_SECRET_ACCESS_KEY ?? '',
  }

  let selectedProfileName = 'private'

  if (!usePrivateAccount) {
    const browser = new Browser()
    await browser.init()
    await browser.authenticate()

    const profiles = await browser.fetchAwsProfiles()
    const selectedProfile = await selectAwsProfile(profiles)
    await setLastSelectedProfile(selectedProfile.profileName)
    selectedProfileName = selectedProfile.profileName

    credentials = await browser.fetchCredentials(selectedProfile.profileId)

    await browser.close()
  }

  const defaultRegion =
    usePrivateAccount && env.AWS_PRIVATE_DEFAULT_REGION ? env.AWS_PRIVATE_DEFAULT_REGION : env.AWS_DEFAULT_REGION

  await setAwsCredentials(credentials, defaultRegion)

  console.info(
    `\nSuccessfully set AWS credentials for profile ${chalk.yellow(selectedProfileName)} to ${chalk.gray(
      AWS_CREDENTIALS_FILE_PATH
    )}`
  )
})()
