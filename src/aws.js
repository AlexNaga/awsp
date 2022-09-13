const fs = require('fs');
const ini = require('ini');
const homedir = require('os').homedir();
const { renderList } = require('./input');

module.exports.AWS_CREDENTIALS_FILE_PATH = `${homedir}/.aws/credentials`;

module.exports.formatAwsCredentials = (data) => {
  data = data.split('\n');
  const accessKeyId = data[1].split('aws_access_key_id=').pop();
  const secretAccessKey = data[2].split('aws_secret_access_key=').pop();
  const sessionToken = data[3].split('aws_session_token=').pop();
  return { accessKeyId, secretAccessKey, sessionToken };
};

module.exports.readIniFile = (filePath) => ini.parse(fs.readFileSync(filePath, 'utf-8'));

module.exports.getAwsCredentials = () => this.readIniFile(this.AWS_CREDENTIALS_FILE_PATH);

module.exports.setAwsCredentials = ({ accessKeyId, secretAccessKey, sessionToken }) => {
  const awsCredentials = this.getAwsCredentials();
  awsCredentials.default.aws_access_key_id = accessKeyId;
  awsCredentials.default.aws_secret_access_key = secretAccessKey;
  awsCredentials.default.aws_session_token = sessionToken;

  fs.writeFileSync(this.AWS_CREDENTIALS_FILE_PATH, ini.stringify(awsCredentials));
};

module.exports.selectAwsProfile = async (awsProfiles) => {
  const formattedList = awsProfiles.map(({ profileName, profileId }) => ({
    title: profileName,
    value: { profileName, profileId },
  }));
  return renderList({ list: formattedList, message: 'Select an AWS profile' });
};
