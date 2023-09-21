const jwt = require("jsonwebtoken");
const ENV = require("../../config");
const status = require("../utils/status");

const Authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (token === null) {
    return res
      .status(status.unauthorized)
      .send("Firstly be login, then request");
  }
  jwt.verify(token, ENV.ACCESS_KEY, (err, user) => {
    if (err) return res.status(status.unauthorized).send("Unauthorized");
    req.user = user;
    return next();
  });
};

module.exports = Authenticate;