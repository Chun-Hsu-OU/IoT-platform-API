// This script is used to control ON/OFFs in sensor hubs.

var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");
var uuid = require("uuid");

var control = express.Router();

var unlencodedParser = bodyParser.urlencoded({
  extended: false
});

control.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

// Gets all the controllers that a sensor hub has
control.get('/control/search/:groupId', function(req, res) {
  var params = {
    TableName: "Controller",
    FilterExpression: "#group = :group_id",
    ExpressionAttributeNames: {
      "#group": "groupId"
    },
    ExpressionAttributeValues: {
      ":group_id": req.params.groupId
    }
  };
  res.setHeader('Access-Control-Allow-Origin', '*');

  docClient.scan(params, onScan);

  function onScan(err, data) {
    if (err) {
      console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      // print all the movies
      console.log("Scan succeeded.");
      data.Items.sort(function(a, b) {
        return parseFloat(a.createdtime) - parseFloat(b.createdtime);
      });
      res.send(JSON.stringify(data, null, 2));
      if (typeof data.LastEvaluatedKey != "undefined") {
        console.log("Scanning for more...");
        params.ExclusiveStartKey = data.LastEvaluatedKey;
        docClient.scan(params, onScan);
      }
    }
  }
});

control.post('/control/limit', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Controller",
    Key: {
        "controllerId": req.body.controllerId
    },
    UpdateExpression: "set limit_min = :min, limit_max = :max",
    ExpressionAttributeValues:{
        ":min": req.body.min,
        ":max": req.body.max
    },
    ReturnValues:"UPDATED_NEW"
  };

  res.set('Access-Control-Allow-Origin', '*');

  console.log("Updating the item...");
  docClient.update(params, function(err, data) {
      if (err) {
          console.error("Unable to UPDATE item. Error JSON:", JSON.stringify(err, null, 2));
          res.send("Error Updating Item");
      } else {
          console.log("UPDATEItem succeeded:", JSON.stringify(data, null, 2));
          res.send("UPDATEItem succeeded");
      }
  });
});

control.post('/control/:item', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Controller",
    Key: {
        "controllerId": req.body.controllerId
    },
    UpdateExpression: "set #thing = :status",
    ExpressionAttributeNames:{
        "#thing": req.params.item
    },
    ExpressionAttributeValues:{
        ":status": req.body.status
    },
    ReturnValues:"UPDATED_NEW"
  };

  res.set('Access-Control-Allow-Origin', '*');

  console.log("Updating the item...");
  docClient.update(params, function(err, data) {
      if (err) {
          console.error("Unable to UPDATE item. Error JSON:", JSON.stringify(err, null, 2));
          res.send("Error Updating Item");
      } else {
          console.log("UPDATEItem succeeded:", JSON.stringify(data, null, 2));
          res.send("UPDATEItem succeeded");
      }
  });
});

module.exports = control;
