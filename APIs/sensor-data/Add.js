var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");
var uuid = require("uuid");

var unlencodedParser = bodyParser.urlencoded({
  extended: false
});

var add = express.Router();

add.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

// adds an area to an owner
add.post('/add/area', unlencodedParser, function(req, res) {
  var d = new Date();

  var params = {
    TableName: "Areas",
    Item: {
      "areaId": uuid.v4(),
      "ownerId": req.body.ownerId,
      "createdtime": d.getTime(),
      "name": req.body.name,
      "location": req.body.location,
      "city": req.body.city,
      "visible": 1
    }
  };

  res.set('Access-Control-Allow-Origin', '*');

  docClient.put(params, function(err, data) {
    if (err) {
      console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Added item:", JSON.stringify(data, null, 2));
      res.send("Added " + req.body.name + " to owner");
    }
  });
});

// adds a sensorGroup to an area
add.post('/add/sensorGroup', unlencodedParser, function(req, res) {
  var d = new Date();

  var params = {
    TableName: "Sensor_Group",
    Item: {
      "groupId": uuid.v4(),
      "areaId": req.body.areaId,
      "createdtime": d.getTime(),
      "name": req.body.name,
      "macAddr": req.body.macAddr,
      "ownerId": req.body.ownerId,
      "visible": 1
    }
  };

  res.set('Access-Control-Allow-Origin', '*');
  docClient.put(params, function(err, data) {
    if (err) {
      console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Added item:", JSON.stringify(data, null, 2));
      res.send("Added " + req.body.name + " to area");
    }
  });
});

// adds a sensor to a sensor group
add.post('/add/sensor', unlencodedParser, function(req, res) {
  var d = new Date();
  var checker = false;

  var params = {
    TableName: "Sensors",
    Item: {
      "sensorId": uuid.v4(),
      "groupId": req.body.groupId,
      "createdtime": d.getTime(),
      "name": req.body.name,
      "macAddr": req.body.macAddr,
      "sensorType": req.body.sensorType,
      "num": req.body.num,
      "ownerId": req.body.ownerId,
      "visible": 1
    }
  };

  res.set('Access-Control-Allow-Origin', '*');
  docClient.put(params, function(err, data) {
    if (err) {
      console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Added item:", JSON.stringify(data, null, 2));
      res.send("Added " + req.body.name + " to sensor group");
    }
  });
});

// 增加一筆異常資料
add.post('/add/abnormal/data', unlencodedParser, function(req, res) {
  var d = new Date();

  var params = {
    TableName: "Abnormal_data",
    Item: {
      "sensor_type": req.body.sensor_type,
      "sensor_name": req.body.sensor_name,
      "sensorId": req.body.sensorId,
      "from_time": req.body.from_time,
      "to_time": req.body.to_time,
      "state": req.body.state
    }
  };

  res.set('Access-Control-Allow-Origin', '*');
  docClient.put(params, function(err, data) {
    if (err) {
      console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Added item:", JSON.stringify(data, null, 2));
      res.send("Added an abnormal data to db");
    }
  });
});

module.exports = add;
