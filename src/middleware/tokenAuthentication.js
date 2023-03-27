const { verify } = require('../auth/TokenService');

exports.tokenAuthentication = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const token = authorization.substring(7);

    try {
      const user = await verify(token);

      req.authenticatedUser = user;
    // eslint-disable-next-line no-empty
    } catch (error) {}
  }
  next();
};
