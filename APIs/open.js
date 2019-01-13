//提供所有公開API
var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");

var open = express.Router();

open.use(bodyParser.urlencoded({
  extended: true
}));

open.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

// 取得一段時間的sensor數據(沒有補空資料)
open.get('/sensors_in_timeinterval/:sensortype/:sensorid/:begin/:end', function(req, res) {
  // each sensor has a different time sync
  var params = {
    TableName: req.params.sensortype,
    ProjectionExpression: "sensorId, #time_id, #v",
    KeyConditionExpression: "sensorId = :sensor_id and #time_id between :t1 and :t2",
    ExpressionAttributeNames: {
      "#time_id": "timestamp",
      "#v": "value"
    },
    ExpressionAttributeValues: {
      ":sensor_id": req.params.sensorid,
      ":t1": Number(req.params.begin),
      ":t2": Number(req.params.end)
    }
  };

  res.set('Access-Control-Allow-Origin', '*');
  docClient.query(params, function(err, data) {
    if (err) {
      console.error("Unable to Query. Error:", JSON.stringify(err, null, 2));
      res.status(404).send("Unable to Query. Error");
    } else {
      console.log("Query succeeded.");
      res.send(JSON.stringify(data, null, 2));
    }
  });
});

//加感測器數值進資料庫
open.post('/add/value', function(req, res) {
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

//查詢特定sensor的id
open.get('/sensors/single/:macAddr/:sensorType/:num', function(req, res) {
  var params = {
    TableName: "Sensors",
    FilterExpression: "#type = :type and #num = :num and #macAddr = :macAddr and #visible = :val",
    ProjectionExpression: "sensorId",
    ExpressionAttributeNames: {
      "#type": "sensorType",
      "#num": "num",
      "#macAddr": "macAddr",
      "#visible": "visible"
    },
    ExpressionAttributeValues: {
      ":type": req.params.sensorType,
      ":num": req.params.num,
      ":macAddr": req.params.macAddr,
      ":val": 1
    }
  };

  res.set('Access-Control-Allow-Origin', '*');

  docClient.scan(params, onScan);

  function onScan(err, data) {
    if (err) {
      console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      // print all the movies
      console.log("Scan succeeded.");
      res.send(data.Items[0].sensorId);
      if (typeof data.LastEvaluatedKey != "undefined") {
        console.log("Scanning for more...");
        params.ExclusiveStartKey = data.LastEvaluatedKey;
        docClient.scan(params, onScan);
      }
    }
  }
});

module.exports = open;