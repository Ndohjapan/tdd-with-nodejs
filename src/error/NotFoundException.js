module.exports = function NotFoundException(message) {
  this.status = 404;
  this.message = message || 'inactive_authentication_failure';
};
