import { AwsProfile } from './models/AwsProfile.js';

import fs from 'fs-extra';
import ini from 'ini';
import { homedir } from 'os';
import { renderList } from './input.js';
import { Credentials } from './models/Credentials.js';

export const AWS_CONFIG_FILE_PATH = `${homedir()}/.aws/config`;
export const AWS_CREDENTIALS_FILE_PATH = `${homedir()}/.aws/credentials`;

export const formatAwsCredentials = (data: string): Credentials => {
  const credentials = data.split('\n');
  const accessKeyId = credentials[1].split('aws_access_key_id=').pop();
  const secretAccessKey = credentials[2].split('aws_secret_access_key=').pop();
  const sessionToken = credentials[3].split('aws_session_token=').pop();

  if (!accessKeyId) throw new Error('Error: accessKeyId has no value');
  if (!secretAccessKey) throw new Error('Error: secretAccessKey has no value');
  if (!sessionToken) throw new Error('Error: sessionToken has no value');

  return { accessKeyId, secretAccessKey, sessionToken };
};

export const readIniFile = (filePath: string) => ini.parse(fs.readFileSync(filePath, 'utf-8'));

export const ensureHasAwsConfigs = async () => {
  await fs.ensureFile(AWS_CREDENTIALS_FILE_PATH);

  // ensure config file defaults
  await fs.ensureFile(AWS_CONFIG_FILE_PATH);
  let awsConfig = readIniFile(AWS_CONFIG_FILE_PATH);

  if (!awsConfig?.default) {
    awsConfig = {
      default: { region: 'eu-north-1', output: 'json' },
    };
    fs.writeFileSync(AWS_CONFIG_FILE_PATH, ini.stringify(awsConfig));
  }
};

export const getAwsCredentials = async () => {
  await ensureHasAwsConfigs();
  return readIniFile(AWS_CREDENTIALS_FILE_PATH);
};

export const setAwsCredentials = async ({
  accessKeyId,
  secretAccessKey,
  sessionToken,
}: {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}) => {
  let awsCredentials = await getAwsCredentials();
  if (!awsCredentials?.default) {
    awsCredentials = { default: {} };
  }

  awsCredentials.default.aws_access_key_id = accessKeyId;
  awsCredentials.default.aws_secret_access_key = secretAccessKey;
  awsCredentials.default.aws_session_token = sessionToken;

  fs.writeFileSync(AWS_CREDENTIALS_FILE_PATH, ini.stringify(awsCredentials));
};

export const selectAwsProfile = async (awsProfiles: AwsProfile[]) => {
  const formattedList = awsProfiles.map(({ profileName, profileId }) => ({
    title: profileName,
    value: { profileName, profileId },
  }));
  return renderList(formattedList, 'Select an AWS profile');
};
