const crypto = require('crypto')

exports.randomString = (length) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};