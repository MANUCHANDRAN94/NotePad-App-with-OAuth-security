require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
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

mongoose.connect("mongodb://localhost:27017/todoDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const itemsSchema = {
  itemName: String,
};

const Item = mongoose.model("Item", itemsSchema);

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);


app.get("/signup", function (req, res) {
  res.render("signup");
});
app.get("/", function (req, res) {
  res.render("signin");
});
app.get("/logout", function (req, res) {
  res.redirect("/");
});




app.get("/listmenu", function (req, res) {
  res.render("listmenu", { todaysDate: date() });
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


app.listen(port, function (req, res) {
  console.log(`server started running at http://${host}:${port}`);
});
