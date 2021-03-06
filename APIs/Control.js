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

// Add a new controller to the DynamoDB
control.post('/add/control', unlencodedParser, function(req, res) {
  var d = new Date();

  var params = {
    TableName: "Controller",
    Item: {
      "controllerId": uuid.v4(),
      "ownerId": req.body.ownerId,
      "areaId": req.body.areaId,
      "groupId": req.body.groupId,
      "name": req.body.name,
      "mode": "none",
      "macAddr": req.body.macAddr,
      "protocol": req.body.protocol,
      "setting": req.body.setting,
      "createdtime": d.getTime(),
      "visible": 1
    }
  }

  res.set('Access-Control-Allow-Origin', '*');

  docClient.put(params, function(err, data) {
    if (err) {
      console.error("Unable to register controller", req.body.name, ". Error JSON:", JSON.stringify(err, null, 2));
      res.send("Unable to register controller", req.body.name);
    } else {
      console.log("PutItem succeeded:", req.body.name);
      res.send("Register succeeded");
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
control.get('/search/control/area/:areaId', function(req, res) {
  var params = {
    TableName: "Controller",
    FilterExpression: "#area = :areaId and #visible = :val",
    ExpressionAttributeNames: {
      "#area": "areaId",
      "#visible": "visible"
    },
    ExpressionAttributeValues: {
      ":areaId": req.params.areaId,
      ":val": 1
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
    FilterExpression: "#owner = :owner_id and #visible = :val",
    ExpressionAttributeNames: {
      "#owner": "ownerId",
      "#visible": "visible"
    },
    ExpressionAttributeValues: {
      ":owner_id": req.params.ownerId,
      ":val": 1
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

  //檢查對應內容是否正確
  var status = req.body.status;
  console.log("type:");
  console.log(typeof req.body.status);
  // console.log(req.body.status);
  var check = true;
  if(req.params.item == "work_cycle"){
    if(typeof status != "string"){
      check = false;
    }
  }else if(req.params.item == "clock_setting"){
    if(Array.isArray(status)){
      for(let i=0; i<status.length; i++){
        if(typeof status[i].duration == "undefined"){
          check = false;
        }
        if(typeof status[i].start == "undefined"){
          check = false;
        }
        if(typeof status[i].weekday == "undefined"){
          check = false;
        }
      }
    }else{
      check = false;
    }
  }else if(req.params.item == "rules"){
    if(Array.isArray(status)){
      for(let i=0; i<status.length; i++){
        if(typeof status[i].block == "undefined"){
          check = false;
        }
        if(typeof status[i].duration == "undefined"){
          check = false;
        }
        if(typeof status[i].name == "undefined"){
          check = false;
        }
        if(typeof status[i].sensorId == "undefined"){
          check = false;
        }
        if(typeof status[i].symbol == "undefined"){
          check = false;
        }
        if(typeof status[i].type == "undefined"){
          check = false;
        }
        if(typeof status[i].value == "undefined"){
          check = false;
        }
      }
    }else{
      check = false;
    }
  }
  
  if(check){
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
  }else{
    res.send("The required value is not given, cannot be updated");
  }

});

//=============================以下為control log==================================
control.post('/add/control/log', unlencodedParser, function(req, res) {
  var d = new Date();

  var params = {
    TableName: "Control_log",
    Item: {
      "controllerId": req.body.controllerId,
      "start_time": req.body.start_time,
      "mode": req.body.mode,
      "start_condition": req.body.start_condition,
      "duration": req.body.duration,
      "state": req.body.state
    }
  }

  res.set('Access-Control-Allow-Origin', '*');

  docClient.put(params, function(err, data) {
    if (err) {
      console.error("Unable add a control log", req.body.controllerId, ". Error JSON:", JSON.stringify(err, null, 2));
      res.send("Unable add a control log", req.body.controllerId);
    } else {
      res.send("add a log successfully");
    }
  });
});

// Gets the certain controller
control.get('/view/control/log/:controllerId', function(req, res) {
  var params = {
    TableName: "Control_log",
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
      res.send(JSON.stringify(data, null, 2));
    }
  });
});
module.exports = control;
