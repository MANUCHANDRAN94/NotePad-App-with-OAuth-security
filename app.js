require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const _ = require("lodash");
const date = require("./date.js");

const app = express();

const host = "127.0.0.1";
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: "mittu poocha",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/todoDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});
mongoose.set("useCreateIndex", true); //to remove this (DeprecationWarning: collection.ensureIndex is deprecated. Use createIndexes instead.)

const itemsSchema = {
  itemName: String,
};
const Item = mongoose.model("Item", itemsSchema);

const listSchema = {
  name: String,
  items: [itemsSchema],
};
const List = mongoose.model("List", listSchema);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  content: [listSchema],
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

app.get("/signup", function (req, res) {
  res.render("signup");
});
app.get("/", function (req, res) {
  res.render("signin");
});
app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.get("/listmenu", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("listmenu", { todaysDate: date() });
  } else {
    res.redirect("/");
  }
});

// let userId = "5f03f0e5de882824e62ac185"

// User.findOne({ _id: userId }, function(err,obj) {
//   const list = new List({
//     name: "Work",
//     items: [{itemName:"item1"},{itemName:"item2"},{itemName:"item3"}]
//   });
//   obj.content.push(list);
//   obj.save();

//    });

app.get("/:customListName", function (req, res) {
  const customListName = _.capitalize(req.params.customListName);
  //give authentication and req.user._id
  if (req.isAuthenticated()) {
    User.findOne({ _id: req.user._id }, (err, foundList) => {
      if (!err) {
        //  Create a new list
        const list = new List({
          name: customListName,
          items: [
            { itemName: "item1" },
            { itemName: "item2" },
            { itemName: "item3" },
          ],
        });
        if (foundList.content.length == 0) {
          foundList.content.push(list);
          foundList.save(function (err, data) {
            if (!err) {
              res.redirect("/" + customListName);
            }
          });
        } else {
          let flag = false;
          // foundList.content.forEach((element) => {
          for (let i = 0; i < foundList.content.length; i++) {
            if (foundList.content[i].name == customListName) {
              //Show an existing list
              flag = true;
              res.render("todolist", {
                listTitle: foundList.content[i].name,
                todaysDate: date(),
                newListItems: foundList.content[i].items,
              });
              break;
            }
          }
          // });

          if (!flag) {
            foundList.content.push(list);
            foundList.save(function (err, data) {
              if (!err) {
                res.redirect("/" + customListName);
              }
            });
          }
        }
      } else {
        console.log(err);
      }
    });
  } else {
    res.redirect("/");
  }
});

app.post("/add", function (req, res) {
  const itemm = req.body.newItem;
  const listName = req.body.list;
  const item = new Item({
    itemName: itemm,
  });

  User.findOne({ _id: req.user._id }, function (err, foundList) {
    //foundList.content.map((element) => {
    for (let i = 0; i < foundList.content.length; i++) {
      if (foundList.content[i].name == listName) {
        foundList.content[i].items.push(item);
        foundList.save();
        res.redirect("/" + listName);
        break;
      }
    }
    //});
  });
});

app.post("/delete", function (req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  User.findByIdAndRemove(
    { _id: req.user._id },
    { $pull: { content: [{ items: [{ _id: checkedItemId }] }] } },
    // { _id: req.user._id },
    // { $pull: { content:[{ items: [{ _id: checkedItemId }] } ]} },
    function (err, foundList) {
      if (!err) {
        res.redirect("/" + listName);
      } else {
        console.log(err);
        res.redirect("/listmenu");
      }
    }
  );
});

app.post("/signup", function (req, res) {

  User.register({ username: req.body.username }, req.body.password, function (
    err,
    user
  ) {
    if (err) {
      console.log(err);
      res.redirect("/signup");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/listmenu");
      });
    }
  });
});

app.post("/", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/listmenu");
      });
    }
  });
});

app.listen(port, function (req, res) {
  console.log(`server started running at http://${host}:${port}`);
});
