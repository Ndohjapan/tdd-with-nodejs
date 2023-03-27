const jwt = require('jsonwebtoken');

exports.createToken = (user) => {
  return jwt.sign({ id: user.id }, 'this-is-our-secret', {expiresIn: 10});
};

exports.verify = (token) => {
  return jwt.verify(token, 'this-is-our-secret');
};
