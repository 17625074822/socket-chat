var express = require("express");
var session = require("express-session");
var app = express();
var http = require("http").Server(app);
var router = require("./controller/router.js");
var mysql = require("mysql");
var formidable = require("./node_modules/formidable");
var path = require("path");
var io = require("socket.io")(http);
var fs = require("fs");
var bodyParser = require("./node_modules/body-parser");
var usocket = [];
var users = {};
var userlist = [];
var a = 0;
var uid = [];
var n = 0;
app.set("view engine", "ejs");
app.use(express.static("./public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({ secret: "sessiontest", resave: true, saveUninitialized: true })
);
//创建mysql
var connection = mysql.createConnection({
  host: "127.0.0.1",
  port: "3306",
  user: "root",
  password: "123456",
  database: "yin"
});
//连接mysql
connection.connect();

//登陆页
app.get("/", function(req, res) {
  if (req.session.user == undefined) {
    res.render("login");
  } else {
    var list_sql =
      "select  fname from user_friend where uname  = " +
      "'" +
      req.session.user +
      "'";
    connection.query(list_sql, function(err, results) {
      if (err) {
        console.log(err);
        return false;
      }
      res.render("chat", { username: req.session.user, result: results });
    });
  }
});

//处理用户登陆
app.post("/userLogin$", function(req, res) {
  name = req.body.name;
  req.session.user = name;
  var pwd = req.body.pwd;
  var sql =
    "select * from user where name =" +
    '"' +
    name +
    '"' +
    "&& pwd = " +
    '"' +
    pwd +
    '"';
  var str = "";
  connection.query(sql, function(err, result) {
    if (err) {
      console.log(err);
      return false;
    }
    str = JSON.stringify(result);
    console.log(str.length);
    if (str.length == 2) {
      res.render("create");
      return false;
    } else {
      var list_sql =
        "select  fname from user_friend where uname  = " +
        "'" +
        req.session.user +
        "'";
      connection.query(list_sql, function(err, results) {
        if (err) {
          console.log(err);
          return false;
        }
        res.render("chat", { username: name, result: results });
      });
    }
  });
});

//注册
app.get("/zhuce", function(req, res) {
  res.render("create");
});

//处理注册
app.post("/dozhuce", function(req, res) {
  var name = req.body.name;
  var pwd = req.body.pwd;
  var repwd = req.body.repwd;
  if (repwd != pwd) {
    res.end("Two passwords are different");
    return false;
  } else if (name == "") {
    res.end("name is null");
    return false;
  } else {
    var addSql = "INSERT INTO user(name,pwd) VALUES(?,?)";
    var addSqlParams = [name, pwd];
    connection.query(addSql, addSqlParams, function(err, result) {
      if (err) {
        console.log("[INSERT ERROR] - ", err.message);
        return;
      }
      console.log(
        "--------------------------INSERT----------------------------"
      );
      if (result.insertId > 0) {
        res.render("success");
      }
    });
  }
});

//群聊
app.get("/qunliao", function(req, res) {
  var name = req.session.user;
  console.log(name);
  res.render("qunliao", { name: name });
});

//处理加好友
app.get("/friend", function(req, res) {
  fname = req.query.fname;
  var sql = "select * from user where name =" + '"' + fname + '"';
  var str = "";
  connection.query(sql, function(err, result) {
    if (err) {
      console.log(err);
      return false;
    }
    str = JSON.stringify(result);
    console.log(str.length);
    if (str.length == 2) {
      res.render("nofriend");
      return false;
    } else {
      var addSql = "INSERT INTO user_friend(uname,fname) VALUES(?,?)";
      var addSqlParams = [req.session.user, fname];
      connection.query(addSql, addSqlParams, function(err, result) {
        if (err) {
          console.log("[INSERT ERROR] - ", err.message);
          return;
        }
        console.log(
          "--------------------------INSERT----------------------------"
        );
        if (result.affectedRows > 0) {
          res.render("addfriend");
        }
      });
    }
  });
});

//进入局部广播
io.of("chat").on("connection", function(socket) {
  console.log("a user connected");
  socket.on("join", function(msg) {
    console.log("我接受到了群聊的信息" + msg);
    io.of("chat").emit("message", msg);
  });
});
//全家广播+私聊+局部广播
io.on("connection", function(socket) {
  console.log("a user connected");
  n++;
  a++;
  socket.on("join", function(name) {
    socket.id = socket.id + name;
    uid.push(socket.id);
    userlist.push(name);
    var hash = unique1(userlist);
    uidlist = unique1(uid);
    io.emit("join", { name: name, userlist: hash, a: a });
    io.emit("people", n);
  });

  socket.on("message", function(msg, name, options = "") {
    if (options == "所有人") {
      io.emit("message", name + " : " + msg);
    } else {
      for (var i = 0; i < uidlist.length; i++) {
        if (uidlist[i].substr(20) == options) {
          io.to(uidlist[i].substr(0, 20)).emit(
            "message",
            name + "偷偷和你" + " 说 : " + msg
          );
        }

        if (uidlist[i].substr(20) == name) {
          io.to(uidlist[i].substr(0, 20)).emit(
            "message",
            "你偷偷的和" + options + " 说 : " + msg
          );
        }
      }
    }
  });

  socket.on("disconnect", function(data) {
    n--;
    io.emit("message", socket.id.substr(20) + "离开了群聊!");
    io.emit("people", n);
  });
});

//监听端口
http.listen(3000);
//去除重复数组
function unique1(arr) {
  var hash = [];
  for (var i = 0; i < arr.length; i++) {
    if (hash.indexOf(arr[i]) == -1) {
      hash.push(arr[i]);
    }
  }
  return hash;
}
