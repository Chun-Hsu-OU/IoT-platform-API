// This script is used to control ON/OFFs in sensor hubs.

var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");
var uuid = require("uuid");

var control = express.Router();

var unlencodedParser = bodyParser.urlencoded({
  extended: false
});

control.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

// Add a new log to the DynamoDB
control.post('/add/control', unlencodedParser, function(req, res) {
  var d = new Date();
  var time = d.getTime();

  var params = {
    TableName: "Controller",
    Item: {
      "controllerId": uuid.v4(),
      "ownerId": req.body.ownerId,
      "groupId": req.body.groupId,
      "name": req.body.name,
      "power": "OFF",
      "clock": "OFF",
      "auto": "OFF",
      "macAddr": req.body.macAddr,
      "protocol": req.body.protocol,
      "setting": req.body.setting,
      "createdtime": time,
      "visible": 1
    }
  };
  docClient.put(params, function(err, data) {
    if (err) {
      console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Added item:", JSON.stringify(data, null, 2));
      res.send("Added Controller in timestamp " + time);
    }
  });
});

control.post('/delete_item/control', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Controller",
    Key: {
      "controllerId": req.body.controllerId
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

// Gets the certain controller
control.get('/control/single/:controllerId', function(req, res) {
  var params = {
    TableName: "Controller",
    KeyConditionExpression: "#control = :controller_id",
    ExpressionAttributeNames: {
      "#control": "controllerId"
    },
    ExpressionAttributeValues: {
      ":controller_id": req.params.controllerId
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

// Gets all the controllers that a sensor hub has
control.get('/search/control/group/:groupId', function(req, res) {
  var params = {
    TableName: "Controller",
    FilterExpression: "#group = :group_id",
    ExpressionAttributeNames: {
      "#group": "groupId"
    },
    ExpressionAttributeValues: {
      ":group_id": req.params.groupId
    }
  };
  res.setHeader('Access-Control-Allow-Origin', '*');

  docClient.scan(params, onScan);

  function onScan(err, data) {
    if (err) {
      console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
      res.send("Unable to scan the table.");
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

// Gets all the controllers that an owner has
control.get('/search/control/owner/:ownerId', function(req, res) {
  var params = {
    TableName: "Controller",
    FilterExpression: "#owner = :owner_id",
    ExpressionAttributeNames: {
      "#owner": "ownerId"
    },
    ExpressionAttributeValues: {
      ":owner_id": req.params.ownerId
    }
  };
  res.setHeader('Access-Control-Allow-Origin', '*');

  docClient.scan(params, onScan);

  function onScan(err, data) {
    if (err) {
      console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
      res.send("Unable to scan the table.");
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

// Gets all the controllers
control.get('/search/control/all', function(req, res) {
  var params = {
    TableName: "Controller",
    FilterExpression: "#exist = :status",
    ExpressionAttributeNames: {
      "#exist": "visible"
    },
    ExpressionAttributeValues: {
      ":status": 1
    }
  };
  res.setHeader('Access-Control-Allow-Origin', '*');

  docClient.scan(params, onScan);

  function onScan(err, data) {
    if (err) {
      console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
      res.send("Unable to scan the table.");
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

control.post('/control/:item', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Controller",
    Key: {
        "controllerId": req.body.controllerId
    },
    UpdateExpression: "set #thing = :status",
    ExpressionAttributeNames:{
        "#thing": req.params.item
    },
    ExpressionAttributeValues:{
        ":status": req.body.status
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
          console.log("UPDATEItem succeeded:", JSON.stringify(data, null, 2));
          res.send("UPDATEItem succeeded");
      }
  });
});

control.post('/control/rule/length', unlencodedParser, function(req, res) {
  var params = {
    TableName: "Controller",
    Key: {
        "controllerId": req.body.controllerId
    },
    UpdateExpression: "set #thing = :len",
    ExpressionAttributeNames:{
        "#thing": "rules_num"
    },
    ExpressionAttributeValues:{
        ":len": req.body.status
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
          console.log("UPDATEItem succeeded:", JSON.stringify(data, null, 2));
          res.send("UPDATEItem succeeded");
      }
  });
});

module.exports = control;
