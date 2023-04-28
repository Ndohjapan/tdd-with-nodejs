const request = require('supertest');
const app = require('../src/app');
const path = require('path');
const FileAttachment = require('../src/file/FileAttachment');
const fs = require('fs');
const config = require('config');
const sequelize = require('../src/config/database');
const en = require('../locales/en/translation.json');
const tr = require('../locales/tr/translation.json');

const { uploadDir, attachmentDir } = config;

beforeAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
});

beforeEach(async () => {
  await FileAttachment.destroy({ truncate: true });
});

const uploadFile = (file = 'test-png.png', options = {}) => {
  const filePath = path.resolve(__dirname, 'resources', file);
  const agent = request(app).post('/api/1.0/hoaxes/attachments');

  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  return agent.attach('file', filePath);
};

describe('Upload File for Hoax', () => {
  it('returns 200 ok after successful upload', async () => {
    const response = await uploadFile();
    expect(response.status).toBe(200);
  });

  it('saves dynamicFilename, uploadDate as attachment object in database', async () => {
    await uploadFile();
    const attachments = await FileAttachment.findAll();
    const attachment = attachments[0];
    expect(attachment.filename).not.toBe('test-png.png');
  });

  it('saves file to the attachment folder', async () => {
    await uploadFile();
    const attachments = await FileAttachment.findAll();
    const attachment = attachments[0];
    const filePath = path.join(
      '.',
      uploadDir,
      attachmentDir,
      attachment.filename
    );
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('saves filetype in attachment object in database', async () => {
    await uploadFile();
    const attachments = await FileAttachment.findAll();
    const attachment = attachments[0];
    expect(attachment.fileType).toBe('image/png');
  });

  it.each`
    file              | fileType
    ${'test-png.png'} | ${'image/png'}
    ${'test-png'}     | ${'image/png'}
    ${'test-gif.gif'} | ${'image/gif'}
    ${'test-jpg.jpg'} | ${'image/jpeg'}
    ${'test-pdf.pdf'} | ${'application/pdf'}
    ${'test-txt.txt'} | ${null}
  `(
    'saves filetype as $fileType in attachment object when $file is uploaded',
    async ({ file, fileType }) => {
      await uploadFile(file);
      const attachments = await FileAttachment.findAll();
      const attachment = attachments[0];
      expect(attachment.fileType).toBe(fileType);
    }
  );

  it.each`
    file              | fileExtension
    ${'test-png.png'} | ${'png'}
    ${'test-png'}     | ${'png'}
    ${'test-gif.gif'} | ${'gif'}
    ${'test-jpg.jpg'} | ${'jpg'}
    ${'test-pdf.pdf'} | ${'pdf'}
    ${'test-txt.txt'} | ${'txt'}
  `(
    'saves file extension as $fileExtension in attachment object when $file is uploaded',
    async ({ file, fileExtension }) => {
      await uploadFile(file);
      const attachments = await FileAttachment.findAll();
      const attachment = attachments[0];

      expect(attachment.filename.endsWith(fileExtension)).toBeTruthy();
      const filePath = path.join(
        '.',
        uploadDir,
        attachmentDir,
        attachment.filename
      );
      expect(fs.existsSync(filePath)).toBe(true);
    }
  );

  it('returns 400 when uploaded file size is bigger than 5mb', async () => {
    const fiveMB = 5 * 1024 * 1024;
    const filePath = path.join('.', '__tests__', 'resources', 'random-file');
    fs.writeFileSync(filePath, 'a'.repeat(fiveMB) + 'a');

    const response = await uploadFile('random-file');
    expect(response.status).toBe(400);
    fs.unlinkSync(filePath);
  });

  it('returns 200 when uploaded file size is 5mb', async () => {
    const fiveMB = 4.99 * 1024 * 1024;
    const filePath = path.join('.', '__tests__', 'resources', 'random-file');
    fs.writeFileSync(filePath, 'a'.repeat(fiveMB));

    const response = await uploadFile('random-file');
    expect(response.status).toBe(200);
    fs.unlinkSync(filePath);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.attachment_size_limit}
    ${'en'}  | ${en.attachment_size_limit}
  `(
    'returns $message when the attachment size is bigger than 5mb when language is $language',
    async ({ language, message }) => {
      const fiveMB = 5 * 1024 * 1024;
      const filePath = path.join('.', '__tests__', 'resources', 'random-file');
      fs.writeFileSync(filePath, 'a'.repeat(fiveMB) + 'a');

      const nowInMillis = Date.now()
      const response = await uploadFile('random-file', { language });
      const error = response.body
      expect(error.path).toBe('/api/1.0/hoaxes/attachments');
      expect(error.message).toBe(message);
      expect(error.timestamp).toBeGreaterThan(nowInMillis);
      fs.unlinkSync(filePath);
    }
  );
});
