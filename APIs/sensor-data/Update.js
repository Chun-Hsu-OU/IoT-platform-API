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
    UpdateExpression: "set #locate = :loc, #area_name = :name, #longitude = :lng, #latitude = :lat",
    ExpressionAttributeNames:{
        "#locate": "location",
        "#area_name": "name",
        "#longitude": "longitude",
        "#latitude": "latitude"
    },
    ExpressionAttributeValues:{
        ":loc": req.body.location,
        ":name": req.body.name,
        ":lng": req.body.longitude,
        ":lat": req.body.latitude
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
    UpdateExpression: "set description = :descrip, #group_name = :name, product = :product",
    ExpressionAttributeNames:{
        "#group_name": "name"
    },
    ExpressionAttributeValues:{
        ":descrip": req.body.description,
        ":name": req.body.name,
        ":product": req.body.product
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

// Updates the chosen item in the "ipc Table"
update.post('/update/ipc/:ipc_id', unlencodedParser, function(req, res) {
    var params = {
      TableName: "ipc",
      Key: {
          "ipcId": req.params.ipc_id
      },
      UpdateExpression: "set #ipc_name = :name, #ipc_ip = :ip",
      ExpressionAttributeNames:{
          "#ipc_name": "name",
          "#ipc_ip": "ip"
      },
      ExpressionAttributeValues:{
          ":name": req.body.name,
          ":ip": req.body.ip
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
