const fs = require('fs');
const ini = require('ini');
const homedir = require('os').homedir();
const { renderList } = require('./input');

module.exports.AWS_CONFIG_FILE_PATH = `${homedir}/.aws/config`;
module.exports.AWS_CREDENTIALS_FILE_PATH = `${homedir}/.aws/credentials`;

module.exports.formatAwsCredentials = (data) => {
  data = data.split('\n');
  const accessKeyId = data[1].split('aws_access_key_id=').pop();
  const secretAccessKey = data[2].split('aws_secret_access_key=').pop();
  const sessionToken = data[3].split('aws_session_token=').pop();
  return { accessKeyId, secretAccessKey, sessionToken };
};

module.exports.readIniFile = (filePath) => ini.parse(fs.readFileSync(filePath, 'utf-8'));

module.exports.getAwsProfile = (awsProfileName) => {
  const awsConfig = this.getAwsConfig();
  const awsProfile = awsConfig[`profile ${awsProfileName}`];

  if (!awsProfile)
    throw new Error(`The AWS profile "${awsProfileName}" couldn't be found in ${this.AWS_CONFIG_FILE_PATH}`);
  return awsProfile;
};

module.exports.getAwsAccountId = (awsProfileName) => {
  const awsProfile = this.getAwsProfile(awsProfileName);
  return awsProfile.role_arn.split(':')[4];
};

module.exports.getAwsProfiles = () => {
  const awsConfig = this.getAwsConfig();
  const rawProfiles = Object.keys(awsConfig);

  const removeDefaultProfile = (profile) => profile !== 'default';
  const cleanLeadingProfileTxt = (profile) => profile.replace('profile ', '');

  const cleanProfiles = rawProfiles.filter(removeDefaultProfile).map(cleanLeadingProfileTxt).sort();
  if (!cleanProfiles.length) throw new Error(`No AWS profiles found in ${this.AWS_CONFIG_FILE_PATH}`);
  return cleanProfiles;
};

module.exports.getAwsProfileName = async () => {
  const passedArg = process.argv[2];
  return passedArg || renderList({ list: this.getAwsProfiles(), message: 'Select an AWS profile' });
};

module.exports.getAwsConfig = () => this.readIniFile(this.AWS_CONFIG_FILE_PATH);

module.exports.getAwsCredentials = () => this.readIniFile(this.AWS_CREDENTIALS_FILE_PATH);

module.exports.setAwsCredentials = ({ accessKeyId, secretAccessKey, sessionToken }) => {
  const awsCredentials = this.getAwsCredentials();
  awsCredentials.default.aws_access_key_id = accessKeyId;
  awsCredentials.default.aws_secret_access_key = secretAccessKey;
  awsCredentials.default.aws_session_token = sessionToken;

  fs.writeFileSync(this.AWS_CREDENTIALS_FILE_PATH, ini.stringify(awsCredentials));
};
