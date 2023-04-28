const fs = require('fs');
const path = require('path');
const config = require('config');
const fileType = require('file-type');
const { randomString } = require('../shared/generator');
const FileAttachment = require('./FileAttachment');
const Sequelize = require('sequelize');
const Hoax = require('../hoax/Hoax');

const { uploadDir, profileDir, attachmentDir } = config;
const profileFolder = path.join('.', uploadDir, profileDir);
const attachmentFolder = path.join('.', uploadDir, attachmentDir);

exports.createFolder = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
  if (!fs.existsSync(profileFolder)) {
    fs.mkdirSync(profileFolder);
  }
  if (!fs.existsSync(attachmentFolder)) {
    fs.mkdirSync(attachmentFolder);
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

exports.saveAttachment = async (file) => {
  const type = await fileType.fromBuffer(file.buffer);

  const filename = type
    ? randomString(32) + '.' + type.ext
    : randomString(32) + '.txt';

  await fs.promises.writeFile(
    path.join(attachmentFolder, filename),
    file.buffer
  );

  const savedAttachments = await FileAttachment.create({
    filename: filename,
    uploadDate: new Date(),
    fileType: type ? type.mime : null,
  });

  return {
    id: savedAttachments.id,
  };
};

exports.associateFileToHoax = async (attachmentId, hoaxId) => {
  const attachment = await FileAttachment.findOne({
    where: { id: attachmentId },
  });
  if (!attachment) {
    return;
  }

  if (attachment.hoaxId) {
    return;
  }

  attachment.hoaxId = hoaxId;
  attachment.save();
};

exports.removeUnusedAttachments = async () => {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  setInterval(async () => {
    const oneDayOld = new Date(Date.now() - ONE_DAY);
    const attachments = await FileAttachment.findAll({
      where: {
        uploadDate: {
          [Sequelize.Op.lt]: oneDayOld,
        },
        hoaxId: {
          [Sequelize.Op.is]: null,
        },
      },
    });

    for (let attachment of attachments) {
      const { filename } = attachment.get({ plain: true });
      await fs.promises.unlink(path.join(attachmentFolder, filename));
      await attachment.destroy();
    }
  }, ONE_DAY);
};

exports.deleteAttachments = async (filename) => {
  const filePath = path.join(attachmentFolder, filename);

  try {
    await fs.promises.access(filePath);
    await fs.promises.unlink(filePath);
    // eslint-disable-next-line no-empty
  } catch (error) {}
};

