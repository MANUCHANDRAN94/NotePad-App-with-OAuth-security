require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const _ = require("lodash");
const date = require("./date.js");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

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
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // useFindAndModify: false,
},(err)=>{if(err){console.log(err)}else{console.log("Database succesfully connected!")}});
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
  googleId: String,
  content: [listSchema],
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

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

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/notepad",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/signup", function (req, res) {
  res.render("signup");
});
app.get("/", function (req, res) {
  res.render("signin");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/notepad",
  passport.authenticate('google', { failureRedirect: "/signup" }),
  function(req, res) {
    res.redirect("/listmenu");
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

app.get("/:customListName", function (req, res) {
  const customListName = _.capitalize(req.params.customListName);
  if (req.isAuthenticated()) {
    User.findOne({ _id: req.user._id }, (err, foundList) => {
      if (!err) {
        //  Create a new list
        const list = new List({
          name: customListName,
          items: [],
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
    for (let i = 0; i < foundList.content.length; i++) {
      if (foundList.content[i].name == listName) {
        foundList.content[i].items.push(item);
        foundList.save();
        res.redirect("/" + listName);
        break;
      }
    }
  });
});

app.post("/delete", function (req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  User.find({ _id: req.user._id }, function (err, foundList) {
    for (let i = 0; i < foundList[0].content.length; i++) {
      if (foundList[0].content[i].name == listName) {
        for (let j = 0; j < foundList[0].content[i].items.length; j++) {
          if (foundList[0].content[i].items[j]._id == checkedItemId) {
            foundList[0].content[i].items.splice(j, j);
            foundList[0].save((err) => {
              if (!err) {
                res.redirect("/" + listName);
                return;
              }
            });
          }
        }
      }
    }
  });
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
