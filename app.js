const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();

const db = require("./models/db");
const userRouter = require("./routers/userRouter");
const todoRouter = require("./routers/todoRouter");
const AppError = require("./utils/appError");
const PORT = process.env.PORT || 3001;
//middleware
//for serving static files
//app.use(express.static(`${__dirname}/public`));
//for serving static files
app.use(express.static(`${__dirname}/build`));
//for logging req
app.use(morgan("dev"));
//for parsing json into req.body
app.use(express.json({ limit: "10kb" }));
//for parsing cookies
app.use(cookieParser());
//using cors
app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    exposedHeaders: ["set-cookie"],
  })
);
app.options("*", cors());
// app.use(function (req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });
//making routes
//for testing
app.get("/api/v1/", (req, res) => {
  res.send("hello there");
});

//for user
app.use("/api/v1/user", userRouter);
//for todos
app.use("/api/v1/todo", todoRouter);

//when no page is match
app.all("*", (req, res, next) => {
  next(new AppError("we cant find anything with your requested url", 404));
});

//error middleware
app.use((err, req, res, next) => {
  let message = err.message;
  let code = err.statusCode ? err.statusCode : 404;
  res.status(code).json({
    message,
  });
});

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
  else {
    app.listen(PORT, (err) => {
      if (err) console.log("err occured ", err);
      else console.log("server is up ,runing on ", PORT);
    });
  }
});
module.exports = db;
