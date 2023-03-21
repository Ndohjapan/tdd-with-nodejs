const app = require('./src/app');
const sequelize = require('./src/config/database');

sequelize.sync({ force: true });
// sequelize.sync();

const port = process.env.PORT || 3030;

app.listen(port, () => {
  console.log('app is running on ' + port);
});
