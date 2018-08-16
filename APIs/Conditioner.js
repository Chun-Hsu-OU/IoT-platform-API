// *New_Ver* This script is used to control ON/OFFs in sensor hubs.

var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");
var uuid = require("uuid");

var conditioner = express.Router();

var unlencodedParser = bodyParser.urlencoded({
  extended: false
});

conditioner.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

// for register usage
conditioner.post('/add/conditioner', unlencodedParser, function(req, res) {
    var d = new Date();
    var checker = false;
  
    var params = {
      TableName: "Conditioner",
      Item: {
        "conditioner_id": uuid.v4(),
        "name": req.body.name,
        "createdtime": d.getTime(),
        "desc": req.body.desc,
        "ownerId": req.body.ownerId,
        "groupId": req.body.groupId,
        "protocol": req.body.protocol,
        "settings": req.body.settings,
        "visible": 1
      }
    }
  
    // Checks if the Conditione has been registered before
    var params_check = {
      TableName: "Conditioner"
    }
  
    docClient.scan(params_check, onScan);
  
    function onScan(err, data) {
      if (err) {
        console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
      } else {
        console.log("Scan succeeded.");
        data.Items.forEach(function(Conditioner) {
          if (Conditioner.name == req.body.name && visible == 1) {
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
            console.error("Unable to register conditioner", req.body.name, ". Error JSON:", JSON.stringify(err, null, 2));
            res.send("Unable to register conditioner", req.body.name);
          } else {
            console.log("PutItem succeeded:", req.body.name);
            res.send("Register succeeded");
          }
        });
      } else {
        res.send("Conditioner Name "+ req.body.name +" already in use");
      }
    }
  });

// gets all conditioner with same owner
conditioner.get('/conditioner/:ownerId', function(req, res) {
  var params = {
    TableName: "Conditioner",
    FilterExpression: "#owner = :owner_id",
    ExpressionAttributeNames: {
      "#owner": "ownerId"
    },
    ExpressionAttributeValues: {
      ":owner_id": req.params.ownerId
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
conditioner.post('/update/Conditioner', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Conditioner",
    Key: {
        "conditioner_id": req.body.conditioner_id
    },
    UpdateExpression: "set #conditioner_name = :name, #desc = :desc, #protocol = :protocol, #settings = :settings",
    ExpressionAttributeNames:{
        "#conditioner_name": "name",
        "#desc": "desc",
        "#protocol": "protocol",
        "#settings": "settings"
    },
    ExpressionAttributeValues:{
        ":name": req.body.name,
        ":desc": req.body.desc,
        ":protocol": req.body.protocol,
        ":settings": req.body.settings
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

conditioner.post('/delete_item/conditioner', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Conditioner",
    Key: {
      "conditioner_id": req.body.conditioner_id,
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

  module.exports = conditioner;
