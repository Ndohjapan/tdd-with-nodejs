exports.pagination = (req, res, next) => {
  // Check if there is any value in page and size
  let page = req.query.page ? req.query.page : 0;
  let size = req.query.size ? req.query.size : 10;

  // Check if it is less than 1
  page = parseInt(page) < 1 ? 0 : parseInt(page);
  size = parseInt(size) < 1 ? 10 : parseInt(size);

  // Check if it is really a number
  page = Number.isInteger(page) ? page : 0;
  size = Number.isInteger(size) ? size : 10;

  // Check if it is more than 999
  size = parseInt(size) >= 1000 ? 10 : size;

  req.pagination = { size, page };
  next();
};
