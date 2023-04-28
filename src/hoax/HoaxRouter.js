const express = require('express');
const AuthenticationException = require('../auth/AuthenticationException');
const { save, getHoaxes, deleteHoax } = require('./HoaxService');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const validationException = require('../error/validationException');
const { pagination } = require('../middleware/pagination');
const ForbiddenException = require('../error/ForbiddenException');

router.post(
  '/api/1.0/hoaxes',
  check('content')
    .isLength({ min: 10, max: 5000 })
    .withMessage('hoax_content_size'),
  async (req, res, next) => {
    if (!req.authenticatedUser) {
      return next(new AuthenticationException('unauthorized_hoax_submit'));
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new validationException(errors.array()));
    }
    if (req.authenticatedUser) {
      try {
        await save(req.body, req.authenticatedUser);
        return res.send({ message: req.t('hoax_submit_success') });
      } catch (error) {
        return next(error);
      }
    }
  }
);

router.get(
  ['/api/1.0/hoaxes', '/api/1.0/users/:userId/hoaxes'],
  pagination,
  async (req, res, next) => {
    const { page, size } = req.pagination;
    try {
      const hoaxes = await getHoaxes(page, size, req.params.userId);
      res.send(hoaxes);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/api/1.0/hoaxes/:hoaxId', async (req, res, next) => {
  if (!req.authenticatedUser) {
    return next(new ForbiddenException('unauthorized_hoax_delete'));
  }

  try {
    await deleteHoax(req.params.hoaxId, req.authenticatedUser.id);
    res.send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
