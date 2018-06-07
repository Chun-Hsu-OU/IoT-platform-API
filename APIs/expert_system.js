var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");

var expert = express.Router();

expert.use(bodyParser.urlencoded({
  extended: true
}));

expert.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

expert.get('/expert/:product', function(req, res) {
  var d = new Date().getMonth() + 1;

  var params = {
    TableName: req.params.product,
    FilterExpression: ":month between monthStart and monthEnd",
    ExpressionAttributeValues: {
      ":month": d
    }
  };

  res.setHeader('Access-Control-Allow-Origin', '*');

  docClient.scan(params, onScan);

  function onScan(err, data) {
    if (err) {
      console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      // print all the movies
      console.log("Scan succeeded.");
      res.send(JSON.stringify(data, null, 2));
      if (typeof data.LastEvaluatedKey != "undefined") {
        console.log("Scanning for more...");
        params.ExclusiveStartKey = data.LastEvaluatedKey;
        docClient.scan(params, onScan);
      }
    }
  }
});

module.exports = expert;
