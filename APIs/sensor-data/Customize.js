var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");

var custom = express.Router();

custom.use(bodyParser.urlencoded({
  extended: true
}));

custom.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

// gets all data within a certain date range
custom.get('/sensors_in_timeinterval/:sensortype/:sensorid/:begin/:end', function(req, res) {
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
    } else {
      console.log("Query succeeded.");
      res.send(JSON.stringify(data, null, 2));
    }
  });
});

custom.get('/authkey', function(req, res) {
  try {
    var doc = yaml.safeLoad(fs.readFileSync('./config/secrets.yml', 'utf8'));
  } catch (e) {
    console.log(e);
  }
  res.set('Access-Control-Allow-Origin', '*');
  res.send(doc.Crypt.KEY);
});

module.exports = custom;
