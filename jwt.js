const jwt = require("jsonwebtoken");
const lang = require("lodash/lang");
require("dotenv").config({ path: __dirname + "/config.env" });

module.exports = {
  createJwt: (data) => {
    return jwt.sign(data, process.env.JWT_SECRET, { expiresIn: "3 days" });
  },
  verifyIsAdmin: (BearerToken) => {
    if (lang.isNil(BearerToken)) return "No permission";
    let token = BearerToken.split(" ")[1];
    try {
      let decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!lang.isNil(decoded.isAdmin) && lang.isEqual(Number(decoded.isAdmin), 1)) return true;
      return false;
    } catch (error) {
      return error;
    }
  },
};
