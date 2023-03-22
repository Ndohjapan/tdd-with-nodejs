// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  let errors = err.errors;
  let validationErrors
  if (errors) {
    validationErrors = {}
    errors.array().forEach((error) => {
      validationErrors[error.param] = req.t(error.msg);
    });
  }

  return res.status(err.status).send({
    path: req.originalUrl,
    timestamp: new Date().getTime(),
    message: req.t(err.message),
    validationErrors,
  });
};
