require("dotenv").config();
const express = require("express");
const mongoose = require("ejs");
const _ = require("lodash");
const date = require("./date.js");

const app = express();

const host = "127.0.0.1"
let port = process.env.PORT;
if(port == null || port == ""){
port = 3000;}

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));


app.get("/signup" , function(req,res){
    res.render("signup")
})
app.get("/signin" , function(req,res){
    res.render("signin")
})
app.get("/list" , function(req,res){
    // res.render("todolist")
    res.render("todolist", {listTitle: "Today",todaysDate: date() ,newListItems: [{name:"hello"},{name:"hello"},{name:"hello"}]});
    
    
})
app.get("/listmenu" , function(req,res){
    res.render("listmenu", {todaysDate: date()});
});



app.listen(port , function(req,res){
    console.log(`server started running at http://${host}:${port}`);
})