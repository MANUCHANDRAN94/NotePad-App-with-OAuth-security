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

app.use(session({
  secret:"mittu poocha",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/todoDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.set("useCreateIndex", true);    //to remove this (DeprecationWarning: collection.ensureIndex is deprecated. Use createIndexes instead.)


const itemsSchema = {
  itemName: String,
};
const Item = mongoose.model("Item", itemsSchema);

const listSchema = {
  name: String,
  items: [itemsSchema]
};
const List = mongoose.model("List", listSchema);



const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  content: listSchema
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
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
  res.logout();
  res.redirect("/");
});




app.get("/listmenu", function (req, res) {
  console.log(req.body);
  if(req.isAuthenticated()){
    console.log('REACHED GETLISTMENU IF CASE');
    
    res.render("listmenu", { todaysDate: date() });
  } else {
    res.redirect("/")
  }
});

app.get("/:customListName", function (req, res) {
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({ name: customListName }, function (err, foundList) {
    if (!err) {
      if (!foundList) {
        //  Create a new list
        const list = new List({
          name: customListName,
          items: [],
        });
        list.save(function(err,data){
          if(!err){
            res.redirect("/" + customListName);
          }
        });
       
      } else {
        //Show an existing list

        res.render("todolist", {
          listTitle: foundList.name,
          todaysDate: date(),
          newListItems: foundList.items,
        });
      }
    }
  });
});


app.post("/add", function(req, res){

    const itemm = req.body.newItem;
    const listName = req.body.list;
  
    const item = new Item({
        itemName: itemm
    });
  
      List.findOne({name: listName}, function(err, foundList){
        foundList.items.push(item);
        foundList.save();
        res.redirect("/" + listName);
      });
    
  });

  app.post("/delete", function(req, res){
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;

      List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, foundList){
        if (!err){
          res.redirect("/" + listName);
        }
      });
 
  
  });

  app.post("/signup", function(req,res){
    console.log('REACHED IN SIGNUP');
    
    User.register({username: req.body.email}, req.body.pass, function(err, user){
      if (err) {
        console.log(err);
        res.redirect("/signup");
      } else {
        passport.authenticate("local")(req, res, function(){
          res.redirect("/listmenu");
        });
      }
    });
  });


  app.post("/", function(req, res){

    

    const user = new User({
      username: req.body.your_name,
      password: req.body.your_pass
    });

    console.log(user);
  
    req.login(user, function(err){  //cjheck what this function does.
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("local",
        //  { successRedirect: '/listmenu',
        // failureRedirect: '/' });
       // (req, res, 
          function(){
          console.log('REACHED IN SIGnin else');
          res.redirect("/listmenu");
        });
      }
    });
  
  });


app.listen(port, function (req, res) {
  console.log(`server started running at http://${host}:${port}`);
});
