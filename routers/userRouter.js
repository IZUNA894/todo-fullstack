const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { promisify } = require("util");
const db = require("./../models/db");
const UserSchema = require("./../models/userModel");
const AppError = require("./../utils/appError");

const router = express.Router();
const collectionName = "user";
//create a user
router.post("/signup", (req, res) => {
  UserSchema.validateAsync(req.body)
    .then((e) => {
      return db.getDB().collection(collectionName).insertOne(req.body);
    })
    .then((result) => {
      let user = result.ops[0];
      if (result.insertedCount != 1) {
        throw new Error("couldn't signup", 400);
      }
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

      res.cookie("jwt", token, {
        expires: new Date(
          Date.now() + process.env.EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        secure: process.env.COOKIE_SECURE === "true",
        httpOnly: true,
      });
      res.status(201).json({
        status: "success",
        token,
        result,
      });
    })
    .catch((err) => {
      res.status(400).json({
        status: "fail",
        err,
        message: err.details[0].message,
      });
    });
});

//for logging in
router.post("/login", (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new AppError("please provide email and password", 400));

  //cehck if user exist and password is correct
  db.getDB()
    .collection(collectionName)
    .findOne({ email, password })
    .then((user) => {
      if (!user) throw new AppError("eamil or password is not correct", 400);

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      res.cookie("jwt", token, {
        expires: new Date(
          Date.now() + process.env.COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        secure: false,
        httpOnly: false,
      });
      res.status(201).json({
        status: "success",
        token,
        result: user,
      });
    })
    .catch((err) => {
      next(err);
    });
});

//for logging out
router.get("/logout", (req, res, next) => {
  res.cookie("jwt", "", {
    expires: new Date(Date.now() + 10 * 1000),
    secure: process.env.COOKIE_SECURE === "true",
    httpOnly: true,
  });
  res.status(201).json({
    status: "success",
  });
});

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
    .findOne({ _id: db.getPrimaryKey(decoded) })
    .then((result) => {
      console.log(result);
    });

  // if (!currentUser)
  //   return next(new AppError("this User is no longer exist", 401));

  // //4. if user has changed the passed after the token has been issued
  // if (await currentUser.changedPasswordAfter(decoded.iat))
  //   return next(
  //     new AppError("User recently changed the password.Please login again", 401)
  //   );

  // req.user = currentUser;
  // res.locals.user = currentUser;
  // next();
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
module.exports = router;
