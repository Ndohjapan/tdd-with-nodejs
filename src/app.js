const express = require('express');
const userRouter = require('./user/UserRouter');
const authRouter = require('./auth/AuthenticationRouter');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');
const errorHandler = require('./error/errorHandler');
const { tokenAuthentication } = require('./middleware/tokenAuthentication');
const FileService = require('./file/FileService');
const config = require('config');
const path = require('path');

const { uploadDir, profileDir } = config;
const profileFolder = path.join('.', uploadDir, profileDir);

const ONE_YEAR_IN_MILLI = 365 * 24 * 60 * 60 * 1000;

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    lng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      lookupHeader: 'accept-language',
    },
  });

FileService.createFolder();

const app = express();

app.use(middleware.handle(i18next));

app.use(express.json({limit: '3mb'}));

app.use(
  '/images',
  express.static(profileFolder, { maxAge: ONE_YEAR_IN_MILLI })
);

app.use(tokenAuthentication);

app.use(userRouter);

app.use(authRouter);

app.use(errorHandler);

module.exports = app;
