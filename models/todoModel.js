const joi = require("joi");
const schema = joi.object().keys({
  val: joi.string().required(),
  date: joi.date().default(new Date().getTime()),
});

module.exports = schema;
