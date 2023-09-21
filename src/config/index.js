require("dotenv").config();

const ENV = {
  APP_PORT: process.env.APP_PORT,
  NODE_ENV: process.env.NODE_ENV,
  API_PREFIX: process.env.API_PREFIX,
  IMAGES_PATH_PREFIX: process.env.IMAGES_PATH_PREFIX,
  REMOTE_IMAGES_HOST_URL: process.env.REMOTE_IMAGES_HOST_URL,
  GROUPS_IMAGES_PATH_PREFIX: process.env.GROUPS_IMAGES_PATH_PREFIX,

  DB_HOST_LOCAL: process.env.DB_HOST_LOCAL,
  DB_PORT_LOCAL: process.env.DB_PORT_LOCAL,
  DB_PASSWORD_LOCAL: process.env.DB_PASSWORD_LOCAL,
  DB_USER_LOCAL: process.env.DB_USER_LOCAL,
  DB_NAME_LOCAL: process.env.DB_NAME_LOCAL,

  DB_HOST_VPS: process.env.DB_HOST_VPS,
  DB_PORT_VPS: process.env.DB_PORT_VPS,
  DB_PASSWORD_VPS: process.env.DB_PASSWORD_VPS,
  DB_USER_VPS: process.env.DB_USER_VPS,
  DB_NAME_VPS: process.env.DB_NAME_VPS,

  ACCESS_KEY: process.env.ACCESS_KEY,
  REFRESH_KEY: process.env.REFRESH_KEY,

  
  
};

module.exports = ENV;
