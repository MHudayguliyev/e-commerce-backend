const express = require("express");
const app = express();
const ENV = require("./src/config");
const cors = require("cors");
const logger = require("morgan");
const path = require("path");
const http = require('http')
const log = require('./src/log/logger')

// -----------------  IMPORT  ROUTES ------------------------- //
const AuthRoutes = require("./src/routes/AuthRoutes");
const GeneralRoutes = require("./src/routes/GeneralRoutes");
const PartnerRoutes = require('./src/routes/PartnerRoutes')
const OrderRoutes = require('./src/routes/OrderRoutes')




// --------------  C O R S    CHECKING ----------------------- //
const whiteList = [
  "http://192.168.8.41:5000",
  "http://192.168.8.41",
  "http://192.168.8.39:5000",
  "http://192.168.8.39",
  "http://localhost:5001",
  "http://localhost",
  "http://192.168.8.101:5001",
  "http://192.168.8.101",
  "http://localhost:1112",
  "http://192.168.8.101:1112",
  "http://192.168.8.41:5173",
  "http://localhost:5173",
  "http://192.168.8.101:5173",
  "http://95.85.122.58",
  "http://95.85.122.58:80",
  "http://hasabym.com.tm",
  "http://hasabym.com.tm:80",
  "http://172.23.128.1:5173",
  "http://192.168.7.3:5173",
  "http://localhost:4173",
  "http://192.168.5.28:5173",
  "http://192.168.5.11:5173",
  "http://192.168.5.19:5173",
  "http://192.168.5.2:5173",
  "http:192.168.5.69",
  "http://192.168.31.37:5173"
];
// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin) return callback(null, true);
//       if (whiteList.indexOf(origin) === -1) {
//         const msg =
//           "The CORS policy for this site does not allow access from the specified Origin.";
//         return callback(new Error(msg), false);
//       }
//       return callback(null, true);
//     },
//     credentials: true,
//   })
// );

app.use(cors())

// ---------------------  USE MIDDLEWARES ------------------------ //
app.use(logger("dev"));
app.use(express.json());
app.use(function (req, res, next) {
  res.header("Content-Type", "application/json;charset=UTF-8");
  res.header("Access-Control-Allow-Credentials", true);
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// ---------------------  USE ROUTES ------------------------ //
const api_prefix = ENV.API_PREFIX
app.use(`${api_prefix}/auth`, AuthRoutes);
app.use(`${api_prefix}/general`, GeneralRoutes);
app.use(`${api_prefix}/partner`, PartnerRoutes);
app.use(`${api_prefix}/order`, OrderRoutes);







const server = http.createServer(app)
server.listen(ENV.APP_PORT, (err) => {
  if (err) {
    log.error("ERROR with server: ", err);
  } else {
    log.info(`Running server on ${ENV.APP_PORT} port...`)
    console.log(`Running server on ${ENV.APP_PORT} port...`)
  }
});


process.on('uncaughtException', (err) => {
  log.error(`Main uncaughtException error: ${err}`)
})