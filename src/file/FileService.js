const fs = require('fs');
const path = require('path');
const config = require('config');
const fileType = require('file-type');
const { randomString } = require('../shared/generator');

const { uploadDir, profileDir } = config;
const profileFolder = path.join('.', uploadDir, profileDir);

exports.createFolder = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
  if (!fs.existsSync(profileFolder)) {
    fs.mkdirSync(profileFolder);
  }
};

exports.saveProfileImage = async (base64File) => {
  const fileName = randomString(32);
  const filePath = path.join(profileFolder, fileName);
  await fs.promises.writeFile(filePath, base64File, 'base64');
  return fileName;
};

exports.deleteproFileImage = async (fileName) => {
  const filePath = path.join(profileFolder, fileName);
  await fs.promises.unlink(filePath);
};

exports.isLessThann2MB = (buffer) => {
  return buffer.length < 2 * 1024 * 1024;
};

exports.isSupportedFileType = async (buffer) => {
  const type = await fileType.fromBuffer(buffer);
  return !type
    ? false
    : type.mime === 'image/png' || type.mime === 'image/jpeg';
};
