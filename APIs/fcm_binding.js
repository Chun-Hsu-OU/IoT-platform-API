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

// 新增 fcmToken 和 account 的綁定
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

// 刪除 fcmToken 和 account 的綁定
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

// 以account去尋找與哪些手機綁定
fcm.get('/fcm/search_binding/:uuid', function(req, res) {
  var params = {
    TableName: "FCM_binding",
    FilterExpression: "#account = :uuid",
    ExpressionAttributeNames: {
      "#account": "account"
    },
    ExpressionAttributeValues: {
      ":uuid": req.params.uuid
    }
  };
  res.set('Access-Control-Allow-Origin', '*');

  docClient.scan(params, onScan);

  function onScan(err, data) {
    if (err) {
      console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Scan succeeded.");
      var fcm_tokens = [];
      for(let i=0; i<data.Count; i++){
        fcm_tokens.push(data.Items[i].fcm_token);
      }
      res.send(JSON.stringify(fcm_tokens, null, 2));

      if (typeof data.LastEvaluatedKey != "undefined") {
        console.log("Scanning for more...");
        params.ExclusiveStartKey = data.LastEvaluatedKey;
        docClient.scan(params, onScan);
      }
    }
  }
});

module.exports = fcm;