import { AwsProfile } from '../models/AwsProfile.js'

import fs from 'fs-extra'
import ini from 'ini'
import { homedir, EOL as osNewLine } from 'os'
import path from 'path'
import { dirname } from 'dirname-filename-esm'
const __dirname = dirname(import.meta)
import { readFile } from './file.js'
import { renderList } from './input.js'
import { AwsCredentials } from '../models/AwsCredentials.js'
import { isIndexFound } from './array.js'

const LAST_SELECTED_PROFILE_FILE_PATH = `${path.join(__dirname, '../.tmp')}/.last-selected-profile`

export const AWS_CONFIG_FILE_PATH = `${homedir()}/.aws/config`
export const AWS_CREDENTIALS_FILE_PATH = `${homedir()}/.aws/credentials`

export const formatAwsCredentials = (data: string): AwsCredentials => {
  const credentials = data.split(osNewLine)
  const accessKeyId = credentials[1].split('aws_access_key_id=').pop()
  const secretAccessKey = credentials[2].split('aws_secret_access_key=').pop()
  const sessionToken = credentials[3].split('aws_session_token=').pop()

  if (!accessKeyId) throw new Error('Error: accessKeyId has no value')
  if (!secretAccessKey) throw new Error('Error: secretAccessKey has no value')
  if (!sessionToken) throw new Error('Error: sessionToken has no value')

  return { accessKeyId, secretAccessKey, sessionToken }
}

export const readIniFile = async (filePath: string) => ini.parse(await fs.readFile(filePath, 'utf-8'))

export const ensureHasAwsConfigs = async (defaultRegion: string) => {
  await fs.ensureFile(AWS_CONFIG_FILE_PATH)
  await fs.ensureFile(AWS_CREDENTIALS_FILE_PATH)

  let awsConfig = await readIniFile(AWS_CONFIG_FILE_PATH)

  // ensure config file defaults
  if (awsConfig?.default && !defaultRegion) return

  awsConfig = {
    default: { region: defaultRegion, output: 'json' },
  }

  await fs.writeFile(AWS_CONFIG_FILE_PATH, ini.stringify(awsConfig))
}

export const getAwsCredentials = async (defaultRegion: string) => {
  await ensureHasAwsConfigs(defaultRegion)
  return readIniFile(AWS_CREDENTIALS_FILE_PATH)
}

export const setAwsCredentials = async (
  { accessKeyId, secretAccessKey, sessionToken = '' }: AwsCredentials,
  defaultRegion: string
) => {
  let awsCredentials = await getAwsCredentials(defaultRegion)
  if (!awsCredentials?.default) {
    awsCredentials = { default: {} }
  }

  awsCredentials.default.aws_access_key_id = accessKeyId
  awsCredentials.default.aws_secret_access_key = secretAccessKey
  awsCredentials.default.aws_session_token = sessionToken

  await fs.writeFile(AWS_CREDENTIALS_FILE_PATH, ini.stringify(awsCredentials))
}

export const getLastSelectedProfile = async () => {
  await fs.ensureFile(LAST_SELECTED_PROFILE_FILE_PATH)
  return readFile(LAST_SELECTED_PROFILE_FILE_PATH)
}

export const getLastSelectedProfileIndex = async (awsProfiles: AwsProfile[]) => {
  const lastSelectedProfile = await getLastSelectedProfile()
  const lastSelectedProfileIndex = awsProfiles.findIndex(({ profileName }) => lastSelectedProfile === profileName)
  return isIndexFound(lastSelectedProfileIndex) ? lastSelectedProfileIndex : 0
}

export const setLastSelectedProfile = async (profileName: string) =>
  fs.writeFile(LAST_SELECTED_PROFILE_FILE_PATH, profileName)

export const selectAwsProfile = async (awsProfiles: AwsProfile[]): Promise<AwsProfile> => {
  const formattedList = awsProfiles.map(({ profileName, profileId }) => ({
    title: profileName,
    value: { profileName, profileId },
  }))

  return renderList(formattedList, 'Select an AWS profile', await getLastSelectedProfileIndex(awsProfiles))
}
