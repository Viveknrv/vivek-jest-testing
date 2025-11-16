const app = require('./index.js');
requie ('dotenv');

const config = {
  port: process.env.PORT || 8080,
};
require('dotenv').config();

const server = app.listen(config.port || 3000, () => {
  console.log(`Server is running on port ${server.address().port}`);
});
