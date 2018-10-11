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
  var checker = false;
  var location = "";
  var longitude = "";
  var latitude = "";
  var ip = "";

  if(req.body.location != ""){
    location = req.body.location;
  }

  if(req.body.longitude != ""){
    longitude = req.body.longitude;
  }

  if(req.body.latitude != ""){
    latitude = req.body.latitude;
  }

  if(req.body.ip != ""){
    ip = req.body.ip;
  }

  var params = {
    TableName: "Areas",
    Item: {
      "areaId": uuid.v4(),
      "ownerId": req.body.ownerId,
      "createdtime": d.getTime(),
      "name": req.body.name,
      "location": location,
      "longitude": longitude,
      "latitude": latitude,
      "ip": ip,
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
        if (items.name == req.body.name && items.visible == 1) {
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
  var plant = "";
  var description = "";
  var macAddr = "";
  var sensorTypes = [];
  var ownerId = "";

  if(req.body.plant != ""){
    plant = req.body.plant;
  }

  if(req.body.description != ""){
    description = req.body.description;
  }

  if(req.body.macAddr != ""){
    macAddr = req.body.macAddr;
  }

  if(JSON.stringify(req.body.sensorTypes)  !== '[]'){
    sensorTypes = req.body.sensorTypes;
  }

  if(req.body.ownerId != ""){
    ownerId = req.body.ownerId;
  }

  var params = {
    TableName: "Sensor_Group",
    Item: {
      "groupId": uuid.v4(),
      "areaId": req.body.areaId,
      "createdtime": d.getTime(),
      "name": req.body.name,
      "macAddr": macAddr,
      "description": description,
      "plant": plant,
      "sensorTypes": sensorTypes,
      "ownerId": ownerId,
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
        if (items.name == req.body.name && items.visible == 1) {
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
        if (items.name == req.body.name && items.visible == 1) {
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
      res.send(false);
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
