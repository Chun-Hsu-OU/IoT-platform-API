// This script is used to control ON/OFFs in sensor hubs.

var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");
var uuid = require("uuid");

var greenhouseDEMO = express.Router();

var unlencodedParser = bodyParser.urlencoded({
  extended: false
});

greenhouseDEMO.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

greenhouseDEMO.post('/greenhouse/add', unlencodedParser, function(req, res) {
    var id = uuid.v4();
    var params = {
      TableName: "greenhouseDEMO",
      Item: {
        "id": id,
        "switch": "OFF"
      }
    };
  
    docClient.put(params, function(err, data) {
      if (err) {
        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
      } else {
        console.log("Added item:", JSON.stringify(data, null, 2));
        res.send("Added a greenhouse controller of id: " + id);
      }
    });
});

greenhouseDEMO.post('/greenhouse/switch', unlencodedParser, function(req, res) {
    var params = {
      TableName: "greenhouseDEMO",
      Key: {
          "id": req.body.id
      },
      UpdateExpression: "set #thing = :switch",
      ExpressionAttributeNames:{
          "#thing": "switch"
      },
      ExpressionAttributeValues:{
          ":switch": req.body.switch
      },
      ReturnValues:"UPDATED_NEW"
    };
  
    res.set('Access-Control-Allow-Origin', '*');
  
    console.log("Updating the item...");
    docClient.update(params, function(err, data) {
        if (err) {
            console.error("Unable to UPDATE item. Error JSON:", JSON.stringify(err, null, 2));
            res.send("Error Updating Item");
        } else {
            console.log("UPDATE Item succeeded:", JSON.stringify(data, null, 2));
            res.send("UPDATE Item succeeded");
        }
    });
  });

greenhouseDEMO.get('/greenhouse/get/:id', function(req, res) {
    var params = {
      TableName: "greenhouseDEMO",
      KeyConditionExpression: "#id = :id",
      ExpressionAttributeNames: {
        "#id": "id"
      },
      ExpressionAttributeValues: {
        ":id": req.params.id
      }
    };
  
    res.set('Access-Control-Allow-Origin', '*');
  
    docClient.query(params, function(err, data) {
        if (err) {
          console.error("Unable to Query. Error:", JSON.stringify(err, null, 2));
          res.send("Unable to query the table.");
        } else {
          console.log("Query succeeded.");
          res.write(JSON.stringify(data, null, 2));
          res.end();
        }
    });
});

module.exports = greenhouseDEMO;