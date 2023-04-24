module.exports = function AuthenticationException(
  message = 'authentication_failure'
) {
  this.status = 401;
  this.message = message;
};
