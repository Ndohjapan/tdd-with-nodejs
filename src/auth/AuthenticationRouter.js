const express = require('express');
const router = express.Router();
const { findByEmail } = require('../user/UserService');
const AuthenticationException = require('./AuthenticationException');
const bcrypt = require('bcrypt');
const ForbiddenException = require('../error/ForbiddenException');
const { check, validationResult } = require('express-validator');
const { createToken, deleteToken } = require('./TokenService');

router.post(
  '/api/1.0/auth',
  check('email').isEmail(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AuthenticationException());
    }
    const { email, password } = req.body;
    const user = await findByEmail(email);

    if (!user) {
      return next(new AuthenticationException());
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return next(new AuthenticationException());
    }

    if (user.inactive) {
      return next(new ForbiddenException());
    }

    const token = await createToken(user);

    res.send({
      id: user.id,
      username: user.username,
      image: user.image,
      token,
    });
  }
);

// eslint-disable-next-line no-unused-vars
router.post('/api/1.0/logout', async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const token = authorization.substring(7);

    await deleteToken(token);
  }
  res.send();
});

module.exports = router;
