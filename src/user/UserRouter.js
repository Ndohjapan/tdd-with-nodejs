const express = require('express');
const router = express.Router();
const { save, findByEmail } = require('./UserService');
const { check, validationResult } = require('express-validator');

router.post(
  '/api/1.0/users',
  check('username')
    .notEmpty()
    .withMessage('username_null')
    .bail()
    .isLength({ min: 4, max: 32 })
    .withMessage('username_size'),
  check('email')
    .notEmpty()
    .withMessage('email_null')
    .bail()
    .isEmail()
    .withMessage('email_invalid')
    .bail()
    .custom(async (email) => {
      let user = await findByEmail(email);
      if (user) throw new Error('email_in_use');
    }),
  check('password')
    .notEmpty()
    .withMessage('password_null')
    .bail()
    .isLength({ min: 6, max: 32 })
    .withMessage('password_size')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('password_constraint'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = {};
      errors.array().forEach((error) => {
        validationErrors[error.param] = req.t(error.msg);
      });
      return res.status(400).send({ validationErrors: validationErrors });
    }
    try {
      await save(req.body);
      return res.send({ message: req.t('user_created') });
    } catch (err) {
      return res.status(502).send(err);
    }
  }
);

module.exports = router;
