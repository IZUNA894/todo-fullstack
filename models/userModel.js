const joi = require("joi");
const schema = joi.object().keys({
  username: joi.string().alphanum().min(3).max(30).required(),
  email: joi.string().email(),
  password: joi.string().alphanum().min(8).required(),
  confirmPassword: joi.ref("password"),
  //   role: Joi.string().alphanum().valid('admin', 'customer').default('customer'),
  // adminSecret: Joi.any().when('role', {
  //             is: Joi.valid('admin'),
  //             then: Joi.string().token().required(),
  //             otherwise: Joi.any().forbidden()
});

module.exports = schema;
