// Rule

var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");
var uuid = require("uuid");

var rule = express.Router();

var unlencodedParser = bodyParser.urlencoded({
  extended: false
});

rule.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

// for register usage
rule.post('/add/rule', unlencodedParser, function(req, res) {
    var checker = false;
    var actions = {};

    if(req.body.actions != {}){
        actions = req.body.actions;
    }
  
    var params = {
      TableName: "Rule",
      Item: {
        "rule_id": uuid.v4(),
        "name": req.body.name,
        "desc": req.body.desc,
        "ownerId": req.body.ownerId,
        "areaId": req.body.areaId,
        "macAddr": req.body.macAddr,
        "sensorType": req.body.sensorType,
        "condition": req.body.condition,
        "threshold": req.body.threshold,
        "actions": actions,
        "visible": 1
      }
    }
  
    // Checks if the Conditione has been registered before
    var params_check = {
      TableName: "Rule"
    }
  
    docClient.scan(params_check, onScan);
  
    function onScan(err, data) {
      if (err) {
        console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
      } else {
        console.log("Scan succeeded.");
        data.Items.forEach(function(rule) {
          if (rule.name == req.body.name && rule.visible == 1) {
            checker = true;
          }
        });
        if (typeof data.LastEvaluatedKey != "undefined") {
          console.log("Scanning for more...");
          params.ExclusiveStartKey = data.LastEvaluatedKey;
          docClient.scan(params_check, onScan);
        }
      }
  
      if (checker == false) {
        docClient.put(params, function(err, data) {
          if (err) {
            console.error("Unable to register Rule", req.body.name, ". Error JSON:", JSON.stringify(err, null, 2));
            res.send("Unable to register Rule", req.body.name);
          } else {
            console.log("PutItem succeeded:", req.body.name);
            res.send("Register succeeded");
          }
        });
      } else {
        res.send("Rule Name "+ req.body.name +" already in use");
      }
    }
  });

// gets all Rule with same IPC
rule.get('/rule/:areaId', function(req, res) {
    var params = {
      TableName: "Rule",
      FilterExpression: "#areaId = :areaId",
      ExpressionAttributeNames: {
        "#areaId": "areaId"
      },
      ExpressionAttributeValues: {
        ":areaId": req.params.areaId
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

// Updates conditioner info
rule.post('/update/rule', unlencodedParser, function(req, res) {
    var params = {
      TableName: "Rule",
      Key: {
          "rule_id": req.body.rule_id
      },
      UpdateExpression: "set #rule_name = :name, #desc = :desc, #condition = :condition, #threshold = :threshold, #actions = :actions",
      ExpressionAttributeNames:{
          "#rule_name": "name",
          "#desc": "desc",
          "#condition": "condition",
          "#threshold": "threshold",
          "#actions": "actions"
      },
      ExpressionAttributeValues:{
          ":name": req.body.name,
          ":desc": req.body.desc,
          ":condition": req.body.condition,
          ":threshold": req.body.threshold,
          ":actions": req.body.actions
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

  rule.post('/delete_item/rule', unlencodedParser, function(req, res) {
    var params = {
      TableName: "Rule",
      Key: {
        "rule_id": req.body.rule_id,
      },
      UpdateExpression: "set visible = :val",
      ExpressionAttributeValues: {
        ":val": 0
      },
      ReturnValues: "UPDATED_NEW"
    };
  
    console.log("Updating the item...");
    res.set('Access-Control-Allow-Origin', '*');
  
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

  module.exports = rule;