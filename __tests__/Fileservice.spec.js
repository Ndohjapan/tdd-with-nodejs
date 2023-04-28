const FileService = require('../src/file/FileService');
const fs = require('fs');
const path = require('path');
const config = require('config');
const Hoax = require('../src/hoax/Hoax');
const FileAttachment = require('../src/file/FileAttachment');
const User = require('../src/user/User');

const { uploadDir, profileDir, attachmentDir } = config;

const profileFolder = path.join('.', uploadDir, profileDir);
const attachmentFolder = path.join('.', uploadDir, attachmentDir);

describe('createFolder', () => {
  it('create upload folder', () => {
    FileService.createFolder();
    const folderName = uploadDir;
    expect(fs.existsSync(folderName)).toBe(true);
  });

  it('creates profile folder under upload folder', () => {
    FileService.createFolder();
    expect(fs.existsSync(profileFolder)).toBe(true);
  });

  it('creates attachment folder under upload folder', () => {
    FileService.createFolder();
    expect(fs.existsSync(attachmentFolder)).toBe(true);
  });
});

describe('Scheduled unused file cleanup', () => {
  const filename = 'test-file' + Date.now();
  const testFile = path.join('.', '__tests__', 'resources', 'test-png.png');

  const targetPath = path.join(attachmentFolder, filename);

  beforeEach(async () => {
    await FileAttachment.destroy({ truncate: true });
    await User.destroy({ truncate: { cascade: true } });
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
  });

  const addHoax = async () => {
    const user = await User.create({
      username: `user1`,
      email: `user1@mail.com`,
    });

    const hoax = await Hoax.create({
      content: `hoax content 1`,
      timestamp: Date.now(),
      userId: user.id,
    });
    return hoax.id;
  };

  it('removes the 24 hour old file with attachment entry if not used in hoax', async () => {
    jest.useFakeTimers();
    fs.copyFileSync(testFile, targetPath);
    const uploadDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const attachment = await FileAttachment.create({
      filename: filename,
      uploadDate: uploadDate,
    });

    await FileService.removeUnusedAttachments();
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 5000);
    jest.useRealTimers();
    setTimeout(async () => {
      const attachmentAfterRemove = await FileAttachment.findOne({
        where: { id: attachment.id },
      });

      expect(attachmentAfterRemove).toBeNull();
      expect(fs.existsSync(targetPath)).toBe(false);
      // eslint-disable-next-line no-undef
      done();
    }, 1000);
  });

  it('keeps the file older than 24 hours and their database entry even not used by a hoax', async () => {
    jest.useFakeTimers();
    fs.copyFileSync(testFile, targetPath);
    const uploadDate = new Date(Date.now() - 23 * 60 * 60 * 1000);
    const attachment = await FileAttachment.create({
      filename: filename,
      uploadDate: uploadDate,
    });

    await FileService.removeUnusedAttachments();
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 5000);
    jest.useRealTimers();
    setTimeout(async () => {
      const attachmentAfterRemove = await FileAttachment.findOne({
        where: { id: attachment.id },
      });

      expect(attachmentAfterRemove).not.toBeNull();
      expect(fs.existsSync(targetPath)).toBe(true);
      // eslint-disable-next-line no-undef
      done();
    }, 1000);
  });

  it('keeps the file older than 24 hours and their database entry even not used by a hoax', async () => {
    jest.useFakeTimers();
    fs.copyFileSync(testFile, targetPath);
    const id = await addHoax();
    const uploadDate = new Date(Date.now() - 23 * 60 * 60 * 1000);
    const attachment = await FileAttachment.create({
      filename: filename,
      uploadDate: uploadDate,
      hoaxId: id,
    });

    await FileService.removeUnusedAttachments();
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 5000);
    jest.useRealTimers();
    setTimeout(async () => {
      const attachmentAfterRemove = await FileAttachment.findOne({
        where: { id: attachment.id },
      });

      expect(attachmentAfterRemove).not.toBeNull();
      expect(fs.existsSync(targetPath)).toBe(true);
      // eslint-disable-next-line no-undef
      done();
    }, 1000);
  });
});
