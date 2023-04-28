const express = require('express');
const router = express.Router();
const multer = require('multer');
const { saveAttachment } = require('./FileService');
const FileSizeException = require('./FileSizeException');

const FIVE_MB = 5 * 1024 * 1024;

const upload = multer({ limits: { fileSize: FIVE_MB } }).single('file');

router.post('/api/1.0/hoaxes/attachments', (req, res, next) => {
  upload(req, res, async (err) => {
    const file = req.file;
    if (err) {
      return next(new FileSizeException());
    }

    const attachment = await saveAttachment(file);

    res.send(attachment);
  });
});

module.exports = router;
