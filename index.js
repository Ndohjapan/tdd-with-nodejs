const app = require('./src/app');
const sequelize = require('./src/config/database');
const { scheduleCleanup } = require('./src/auth/TokenService');

sequelize.sync();

scheduleCleanup()

const port = process.env.PORT || 3030;

app.listen(port, () => {
  console.log('app is running on ' + port);
});
