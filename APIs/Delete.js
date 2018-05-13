var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");
var unlencodedParser = bodyParser.urlencoded({
  extended: false
});

var delete_item = express.Router();

delete_item.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

delete_item.post('/delete_item/area', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Areas",
    Key: {
      "ownerId": req.body.ownerId,
      "areaId": req.body.areaId
    },
    UpdateExpression: "set visible = :val",
    ExpressionAttributeValues: {
      ":val": 0
    },
    ReturnValues: "UPDATED_NEW"
  };

  console.log("Updating the item...");
  docClient.update(params, function(err, data) {
    if (err) {
      console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
      res.send("Error deleting from DB");
    } else {
      console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
      res.send("Deletion succeed");
    }
  });
});

delete_item.post('/delete_item/group', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Sensor_Group",
    Key: {
      "areaId": req.body.areaId,
      "groupId": req.body.groupId
    },
    UpdateExpression: "set visible = :val",
    ExpressionAttributeValues: {
      ":val": 0
    },
    ReturnValues: "UPDATED_NEW"
  };

  console.log("Updating the item...");
  docClient.update(params, function(err, data) {
    if (err) {
      console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
      res.send("Error deleting from DB");
    } else {
      console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
      res.send("Deletion succeed");
    }
  });
});

delete_item.post('/delete_item/sensor', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Sensors",
    Key: {
      "groupId": req.body.groupId,
      "sensorId": req.body.sensorId
    },
    UpdateExpression: "set visible = :val",
    ExpressionAttributeValues: {
      ":val": 0
    },
    ReturnValues: "UPDATED_NEW"
  };

  console.log("Updating the item...");
  docClient.update(params, function(err, data) {
    if (err) {
      console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
      res.send("Error deleting from DB");
    } else {
      console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
      res.send("Deletion succeed");
    }
  });
});


module.exports = delete_item;
