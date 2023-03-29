const { Joi } = require("express-validation");
const { trim } = require("lodash");

module.exports = {
  login: {
    body: Joi.object({
      email: Joi.string()
        .email()
        .regex(/^[\w\.\-]+@[\w\.\-]+$/)
        .trim()
        .required(),
      password: Joi.string()
        .regex(/^[^<>]+$/)
        .trim()
        .required(),
    }),
  },
  changePassword: {
    body: Joi.object({
      email: Joi.string()
        .email()
        .regex(/^[\w\.\-]+@[\w\.\-]+$/)
        .trim()
        .required(),
      password: Joi.string()
        .regex(/^[^<>]+$/)
        .trim()
        .required(),
      newPassword: Joi.string()
        .min(5)
        .regex(/^[^<>]+$/)
        .disallow(Joi.ref("password"))
        .trim()
        .required(),
    }),
  },
  createProduct: {
    body: Joi.object({
      name: Joi.string()
        .regex(/^[\w ]*$/)
        .trim()
        .required(),
      description: Joi.string()
        .regex(/^[\w\s,.]*$/)
        .trim()
        .required(),
      cid: Joi.number().required(),
      price: Joi.number().min(0.001).required(),
      inventory: Joi.number().min(1).required(),
    }),
  },
  updateProduct: {
    body: Joi.object({
      pid: Joi.number().required(),
      name: Joi.string()
        .regex(/^[\w ]*$/)
        .trim()
        .required(),
      description: Joi.string()
        .regex(/^[\w\s,.]*$/)
        .trim()
        .required(),
      cid: Joi.number().required(),
      price: Joi.number().min(0.001).required(),
      inventory: Joi.number().min(1).required(),
      img: Joi.string()
        .regex(/^[\w.]+$/)
        .required(),
      oldName: Joi.string()
        .regex(/^[\w ]*$/)
        .trim()
        .required(),
    }),
  },
  deleteProduct: {
    body: Joi.object({
      pid: Joi.number().required(),
      img: Joi.string()
        .regex(/^[\w.]+$/)
        .required(),
    }),
  },
  createCategory: {
    body: Joi.object({
      name: Joi.string()
        .regex(/^[\w ]*$/)
        .trim()
        .required(),
    }),
  },
  updateCategory: {
    body: Joi.object({
      name: Joi.string()
        .regex(/^[\w ]*$/)
        .trim()
        .required(),
      cid: Joi.number().required(),
    }),
  },
  deleteCategory: {
    body: Joi.object({
      cid: Joi.number().required(),
    }),
  },
  createCustomId: {
    body: Joi.object({
      shoppingCart: Joi.string()
        .regex(/^[^<>]+$/)
        .required(),
      totalPrice: Joi.number().required(),
      currency: Joi.string().required(),
    }),
  },
  storeRecord: {
    body: Joi.object({
      record: Joi.string()
        .regex(/^[^<>]+$/)
        .required(),
      shoppingCart: Joi.string()
        .regex(/^[^<>]+$/)
        .required(),
      invoiceId: Joi.string()
        .regex(/^[^<>]+$/)
        .required(),
      customId: Joi.string()
        .regex(/^[^<>]+$/)
        .required(),
    }),
  },
};
