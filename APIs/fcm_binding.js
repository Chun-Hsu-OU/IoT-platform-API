var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");

var unlencodedParser = bodyParser.urlencoded({
  extended: false
});

var fcm = express.Router();

fcm.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

// adds a fcmToken and account binding
fcm.post('/fcm/add_binding', unlencodedParser, function(req, res) {
  var params = {
    TableName: "FCM_binding",
    Item: {
      "fcm_token": req.body.fcm_token,
      "account": req.body.account
    }
  };

  res.set('Access-Control-Allow-Origin', '*');

  docClient.put(params, function(err, data) {
    if (err) {
      console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Added item:", JSON.stringify(data, null, 2));
      res.send("Added a fcmToken and account binding");
    }
  });
});

// adds a fcmToken and account binding
fcm.post('/fcm/delete_binding', unlencodedParser, function(req, res) {
    var params = {
        TableName: "FCM_binding",
        Key: {
            "fcm_token": req.body.fcm_token
        }
    };

    res.set('Access-Control-Allow-Origin', '*');

    docClient.delete(params, function(err, data) {
        if (err) {
            console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
            res.send("deleted a fcmToken and account binding");
        }
    });
});

module.exports = fcm;