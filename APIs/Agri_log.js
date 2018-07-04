var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");

//var uuid = require("uuid");

var agri_log = express.Router();

var unlencodedParser = bodyParser.urlencoded({
  extended: false
});

agri_log.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

// Add a new log to the DynamoDB
agri_log.post('/add/log', unlencodedParser, function(req, res) {
  var d = new Date();
  var time = d.getTime();

  var params = {
    TableName: "Agri_log",
    Item: {
      "ownerId": req.body.ownerId,
      "timestamp": time,
      "area": req.body.area,
      "type": req.body.type,
      "memo": req.body.memo,
      "set_time": req.body.set_time,
      "author": req.body.author,
      "files": req.body.files,
      "machine": req.body.machine,
      "crop": req.body.crop,
      "diseases": req.body.diseases,
      "visible": 1
    }
  };
  docClient.put(params, function(err, data) {
    if (err) {
      console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Added item:", JSON.stringify(data, null, 2));
      res.send("Added Log in timestamp " + time);
    }
  });
});

agri_log.get('/search/log/:feature/:value', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Agri_log",
    FilterExpression: "#feature = :feature_description",
    ExpressionAttributeNames: {
      "#feature": req.params.feature
    },
    ExpressionAttributeValues: {
      ":feature_description": req.params.value
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
      data.Items.sort(function(a, b) {
        return parseFloat(a.set_time) - parseFloat(b.set_time);
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

agri_log.post('/delete_item/log', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Agri_log",
    Key: {
      "ownerId": req.body.ownerId,
      "timestamp": req.body.timestamp
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

agri_log.post('/update/log', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Agri_log",
    Key: {
      "ownerId": req.body.ownerId,
      "timestamp": req.body.timestamp
    },
    UpdateExpression: "set area = :new_area, memo = :new_memo, author = :new_author, set_time = :new_set_time, #log_type = :new_type, files = :new_files, machine = :new_machine, crop = :new_crop, diseases = :new_diseases",
    ExpressionAttributeNames:{
        "#log_type": "type"
    },
    ExpressionAttributeValues: {
      ":new_area": req.body.area,
      ":new_memo": req.body.memo,
      ":new_author": req.body.author,
      ":new_set_time": req.body.set_time,
      ":new_type": req.body.type,
      ":new_files": req.body.files,
      ":new_machine": req.body.machine,
      ":new_crop": req.body.crop,
      ":new_diseases": req.body.diseases
    },
    ReturnValues: "UPDATED_NEW"
  };

  console.log("Updating the item...");
  docClient.update(params, function(err, data) {
    if (err) {
      console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
      res.send("Error updating to DB");
    } else {
      console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
      res.send("Update succeed");
    }
  });
});

module.exports = agri_log;
