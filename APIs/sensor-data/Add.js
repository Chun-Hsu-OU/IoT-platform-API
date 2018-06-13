var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");
var unlencodedParser = bodyParser.urlencoded({
  extended: false
});

var add = express.Router();
const uuidv1 = require('uuid/v1');

add.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

// adds an area to an owner
add.post('/add/area', unlencodedParser, function(req, res) {
  var d = new Date();
  var checker = false;

  var params = {
    TableName: "Areas",
    Item: {
      "areaId": uuidv1(),
      "ownerId": req.body.ownerId,
      "createdtime": d.getTime(),
      "name": req.body.name,
      "location": req.body.location,
      "map_location": req.body.map_location,
      "visible": 1
    }
  };

  var params_check = {
    TableName: "Areas"
  }

  res.set('Access-Control-Allow-Origin', '*');
  docClient.scan(params_check, onScan);

  function onScan(err, data) {
    if (err) {
      console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Scan succeeded.");
      data.Items.forEach(function(items) {
        if (items.name == req.body.name && visible == 1) {
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
          console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
          console.log("Added item:", JSON.stringify(data, null, 2));
          res.send("Added " + req.body.name + " to owner");
        }
      });
    } else {
      res.send("Area name already in use, please try another one");
    }
  }
});

// adds a sensorGroup to an area
add.post('/add/sensorGroup', unlencodedParser, function(req, res) {
  var d = new Date();
  var checker = false;

  var params = {
    TableName: "Sensor_Group",
    Item: {
      "groupId": uuidv1(),
      "areaId": req.body.areaId,
      "createdtime": d.getTime(),
      "name": req.body.name,
      "description": req.body.name,
      "plant": req.body.plant,
      "visible": 1
    }
  };

  var params_check = {
    TableName: "Sensor_Group"
  }

  res.set('Access-Control-Allow-Origin', '*');
  docClient.scan(params_check, onScan);

  function onScan(err, data) {
    if (err) {
      console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Scan succeeded.");
      data.Items.forEach(function(items) {
        if (items.name == req.body.name && visible == 1) {
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
          console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
          console.log("Added item:", JSON.stringify(data, null, 2));
          res.send("Added " + req.body.name + " to area");
        }
      });
    } else {
      res.send("Sensor Group name already in use, please try another one");
    }
  }
});

// adds a sensor to a sensor group
add.post('/add/sensor', unlencodedParser, function(req, res) {
  var d = new Date();
  var checker = false;

  var params = {
    TableName: "Sensors",
    Item: {
      "sensorId": uuidv1(),
      "groupId": req.body.groupId,
      "createdtime": d.getTime(),
      "name": req.body.name,
      "sensorType": req.body.sensorType,
      "ownerId": req.body.ownerId,
      "visible": 1
    }
  };

  var params_check = {
    TableName: "Sensors"
  }

  res.set('Access-Control-Allow-Origin', '*');
  docClient.scan(params_check, onScan);

  function onScan(err, data) {
    if (err) {
      console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Scan succeeded.");
      data.Items.forEach(function(items) {
        if (items.name == req.body.name && visible == 1) {
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
          console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
          console.log("Added item:", JSON.stringify(data, null, 2));
          res.send("Added " + req.body.name + " to sensor group");
        }
      });
    } else {
      res.send("Sensor name already in use, please try another one");
    }
  }
});

add.post('/add/value', unlencodedParser, function(req, res) {
  var d = new Date();
  var checker = false;
  var time = d.getTime();
  //console.log("Hi" + req.body.sensorType);

  var params = {
    TableName: req.body.sensorType,
    Item: {
      "sensorId": req.body.sensorId,
      "timestamp": time,
      "sensorType": req.body.sensorType,
      "value": req.body.value
    }
  };

  docClient.put(params, function(err, data) {
    if (err) {
      console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Added item:", JSON.stringify(data, null, 2));
      res.send("Added sensing data of " + req.body.sensorId + " to DB");
    }
  });
});

module.exports = add;
