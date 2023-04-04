const app = require('./src/app');
const sequelize = require('./src/config/database');
const { scheduleCleanup } = require('./src/auth/TokenService');
const logger = require('./src/shared/logger');

sequelize.sync();

scheduleCleanup();

const port = process.env.PORT || 3030;

app.listen(port, () => {
  logger.info(
    'app is running on ' + port + ` Version: ${process.env.npm_package_version}`
  );
});
