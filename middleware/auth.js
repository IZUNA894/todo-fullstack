const express = require("express");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const db = require("./../models/db");
const UserSchema = require("./../models/userModel");
const AppError = require("./../utils/appError");
const collectionName = "user";
//for checking auth
module.exports.checkAuth = async (req, res, next) => {
  //1. checking the token n if its there
  let token = "";
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(new AppError("your are not login", 401));
  }

  //2. checking if token is correct or not
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //3. checking if user in db
  db.getDB()
    .collection(collectionName)
    .findOne({ _id: db.getPrimaryKey(decoded.id) })
    .then((result) => {
      if (!result)
        return next(new AppError("this User is no longer exist", 401));

      req.user = result;

      next();
    })
    .catch((err) => {
      next(err);
    });
};

db.connect((err) => {
  // If err unable to connect to database
  // End application
  if (err) {
    console.log("unable to connect to database");
    process.exit(1);
  }
  // Successfully connected to database
  // Start up our Express Application
  // And listen for Request
});
