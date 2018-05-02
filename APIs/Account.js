var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");
var uuid = require("uuid");

var account = express.Router();

var unlencodedParser = bodyParser.urlencoded({
  extended: false
});

account.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

// for register usage
account.post('/account/', unlencodedParser, function(req, res) {
  var d = new Date();
  var checker = false;

  var params = {
    TableName: "Account",
    Item: {
      "uuid": uuid.v4(),
      "createdtime": d.getTime(),
      "email": req.body.email,
      "password": req.body.password,
      "name": req.body.name
    }
  }

  // Checks if the email has been registered before
  var params_check = {
    TableName: "Account"
  }

  docClient.scan(params_check, onScan);

  function onScan(err, data) {
    if (err) {
      console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Scan succeeded.");
      data.Items.forEach(function(accounts) {
        if (accounts.email == req.body.email) {
          checker = true;
        }
      });
      if (typeof data.LastEvaluatedKey != "undefined") {
        console.log("Scanning for more...");
        params.ExclusiveStartKey = data.LastEvaluatedKey;
        docClient.scan(params, onScan);
      }
    }

    if (checker == false) {
      docClient.put(params, function(err, data) {
        if (err) {
          console.error("Unable to register account", req.body.name, ". Error JSON:", JSON.stringify(err, null, 2));
        } else {
          console.log("PutItem succeeded:", req.body.name);
          res.send("Register succeeded");
        }
      });
    } else {
      res.send("Email address already in use");
    }
  }
});

// for login usage
account.post('/account/login/', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Account"
  }
  var login = false;

  console.log("Scanning SensorGroup table.");
  docClient.scan(params, onScan);

  function onScan(err, data) {
    if (err) {
      console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Scan succeeded.");
      data.Items.forEach(function(accounts) {
        if ((accounts.email == req.body.email) && (accounts.password == req.body.password)) {
          login = accounts.uuid;
          console.log(req.body.email + req.body.password);
          console.log(login);
        }
      });
      if (typeof data.LastEvaluatedKey != "undefined") {
        console.log("Scanning for more...");
        params.ExclusiveStartKey = data.LastEvaluatedKey;
        docClient.scan(params, onScan);
      }
    }
    res.send(login)
  }
});

account.get('/account/all', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Account"
  }

  res.set('Access-Control-Allow-Origin', '*');
  docClient.scan(params, onScan);

  function onScan(err, data) {
    if (err) {
      //console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
      res.send("account query failed");
    } else {
      //console.log("Scan succeeded.");
      res.send(JSON.stringify(data, null, 2));
    }
    if (typeof data.LastEvaluatedKey != "undefined") {
      console.log("Scanning for more...");
      params.ExclusiveStartKey = data.LastEvaluatedKey;
      docClient.scan(params, onScan);
    }
  }
});

// To get user information
account.get('/account/single/:uuid', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Account",
    Key: {
      "uuid": req.params.uuid
    }
  }
  res.set('Access-Control-Allow-Origin', '*');

  docClient.get(params, function(err, data) {
    if (err) {
      //console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      //console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
      res.send(data.Item.name);
    }
  });
});

module.exports = account;
