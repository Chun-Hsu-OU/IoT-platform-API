// This script is used to update stored information in items.

var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");
var uuid = require("uuid");

var update = express.Router();

var unlencodedParser = bodyParser.urlencoded({
  extended: false
});

update.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

// Updates the chosen item in the "Area Table"
update.post('/update/area', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Areas",
    Key: {
        "ownerId": req.body.ownerId,
        "areaId": req.body.areaId
    },
    UpdateExpression: "set #locate = :loc, #area_name = :name",
    ExpressionAttributeNames:{
        "#locate": "location",
        "#area_name": "name"
    },
    ExpressionAttributeValues:{
        ":loc": req.body.location,
        ":name": req.body.name
    },
    ReturnValues:"UPDATED_NEW"
  };

  res.set('Access-Control-Allow-Origin', '*');

  console.log("Updating the item...");
  docClient.update(params, function(err, data) {
      if (err) {
          console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
          res.send("Error Updating Item");
      } else {
          console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
          res.send("UpdateItem succeeded");
      }
  });
});

// Updates the chosen item in the "Sensor_Group Table"
update.post('/update/group', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Sensor_Group",
    Key: {
        "areaId": req.body.areaId,
        "groupId": req.body.groupId
    },
    UpdateExpression: "set #group_name = :name, #macAddr = :macAddr",
    ExpressionAttributeNames:{
        "#group_name": "name",
        "#macAddr": "macAddr"
    },
    ExpressionAttributeValues:{
        ":name": req.body.name,
        ":macAddr": req.body.macAddr
    },
    ReturnValues:"UPDATED_NEW"
  };

  res.set('Access-Control-Allow-Origin', '*');

  console.log("Updating the item...");
  docClient.update(params, function(err, data) {
      if (err) {
          console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
          res.send("Error Updating Item");
      } else {
          console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
          res.send("UpdateItem succeeded");
      }
  });
});

// Updates the chosen item in the "Sensors Table"
update.post('/update/sensor', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Sensors",
    Key: {
        "groupId": req.body.groupId,
        "sensorId": req.body.sensorId
    },
    UpdateExpression: "set sensorType = :type, #sensor_name = :name",
    ExpressionAttributeNames:{
        "#sensor_name": "name"
    },
    ExpressionAttributeValues:{
        ":type": req.body.sensorType,
        ":name": req.body.name,
    },
    ReturnValues:"UPDATED_NEW"
  };

  res.set('Access-Control-Allow-Origin', '*');

  console.log("Updating the item...");
  docClient.update(params, function(err, data) {
      if (err) {
          console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
          res.send("Error Updating Item");
      } else {
          console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
          res.send("UpdateItem succeeded");
      }
  });
});

module.exports = update;
