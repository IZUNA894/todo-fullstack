const express = require("express");
const TodoSchema = require("./../models/todoModel");
const db = require("./../models/db");
const { checkAuth } = require("./../middleware/auth");
const joi = require("joi");
const collectionName = "todo";
const router = express.Router();
const AppError = require("./../utils/appError");

const getAllTodo = () => {
  return new Promise((resolve, reject) => {
    db.getDB()
      .collection(collectionName)
      .aggregate([
        {
          $group: {
            _id: "$owner",

            todos: {
              $push: {
                id: "$_id",
                date: "$date",
                val: "$val",
              },
            },
          },
        },
      ])
      .toArray((err, collections) => {
        if (err) reject(err);
        else {
          resolve(collections);
        }
      });
  });
};

const processAllTodo = (todos) => {
  return new Promise((resolve, reject) => {
    db.getDB()
      .collection("user")
      .find({ role: { $ne: "admin" } })
      .toArray((err, collections) => {
        if (err) throw new AppError("some err ocurred", 500);
        let myArr = collections.map((x) => {
          let todosArr = [];
          todosArr = todos.find((y) => {
            return JSON.stringify(y._id) == JSON.stringify(x._id);
          });
          if (todosArr == undefined) todosArr = [];
          else todosArr = todosArr.todos;
          return { _id: x._id, username: x.username, todos: todosArr };
        });
        resolve(myArr);
      });
  });
};
//creating a todo
router.post("/create", checkAuth, (req, res) => {
  const { _id, role } = req.user;

  TodoSchema.validateAsync(req.body)
    .then((e) => {
      let todoBody = e;
      todoBody.owner = _id;
      return db.getDB().collection(collectionName).insertOne(todoBody);
    })
    .then((result) => {
      if (result.insertedCount != 1) {
        throw new Error("Failed to insert Todo Document", 400);
      }

      res.status(201).json({
        status: "success",
        result: result,
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

//promisifying cursor function
var CursorUtil = (err, documents) => {
  return new Promise(function (resolve, reject) {
    if (err) {
      reject(err);
    } else {
      resolve(documents);
    }
  });
};

//getting all to do is
router.get("/get", checkAuth, (req, res) => {
  const { _id, role } = req.user;

  let query = {};
  if (role === "admin") {
    getAllTodo()
      .then((result) => {
        return processAllTodo(result);
      })
      .then((result) => {
        res.status(200).json({
          status: "success",
          length: result.length,
          result: result,
        });
      })
      .catch((err) => {
        if (err.isOperational) {
          return next(err);
        }

        let code = err.statusCode ? err.statusCode : 404;
        res.status(404).json({
          status: "fail",
          err,
          message: err.details[0].message,
        });
      });
  } else {
    query = { owner: db.getPrimaryKey(_id) };
    const options = {
      sort: { title: -1 },
    };

    db.getDB()
      .collection(collectionName)
      .find(query, options)
      .toArray((err, result) => {
        if (err) {
          res.status(400).json({
            status: "fail",
            err,
            message: err.details[0].message,
          });
        }
        res.status(200).json({
          status: "success",
          length: result.length,
          result: result,
        });
      });
  }
});

//update a todo by id
router.put("/update/:id", checkAuth, (req, res, next) => {
  const { _id, role } = req.user;

  let todoBody = "";
  db.getDB()
    .collection(collectionName)
    .findOne({
      _id: db.getPrimaryKey(req.params.id),
      owner: db.getPrimaryKey(_id),
    })
    .then((result) => {
      if (!result) {
        throw new AppError("cant find the todo", 404);
      }

      todoBody = { ...result, ...req.body };
      delete todoBody._id;
      delete todoBody.owner;

      return TodoSchema.validateAsync(todoBody);
    })
    .then((e) => {
      todoBody.owner = _id;

      return db
        .getDB()
        .collection(collectionName)
        .findOneAndUpdate(
          { _id: db.getPrimaryKey(req.params.id) },
          { $set: { ...todoBody } },
          { returnOriginal: false }
        );
    })
    .then((result) => {
      res.status(200).json({
        status: "success",
        result: result,
      });
    })
    .catch((err) => {
      if (err.isOperational) {
        return next(err);
      }

      let code = err.statusCode ? err.statusCode : 404;
      res.status(404).json({
        status: "fail",
        err,
        message: err.details[0].message,
      });
    });
});

//delete a task
router.delete("/delete/:id", checkAuth, (req, res, next) => {
  const { _id, role } = req.user;

  db.getDB()
    .collection(collectionName)
    .findOneAndDelete({
      _id: db.getPrimaryKey(req.params.id),
      owner: db.getPrimaryKey(_id),
    })
    .then((e) => {
      if (!e.value) throw new AppError("Failed to Todo Delete", 404);

      res.status(204).json({
        status: "success",
      });
    })
    .catch((err) => {
      if (err.isOperational) return next(err);
      res.status(400).json({
        status: "fail",
        message: err,
      });
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
});
module.exports = router;
