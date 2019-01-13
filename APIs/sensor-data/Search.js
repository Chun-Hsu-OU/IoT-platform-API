var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");

var search = express.Router();

search.use(bodyParser.urlencoded({
  extended: true
}));

search.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

// gets all areaIds of an owner
search.get('/area/:ownerId', function(req, res, next) {

  var params = {
    TableName: "Areas",
    KeyConditionExpression: "#owner = :owner_id",
    FilterExpression: "#visible = :val",
    ExpressionAttributeNames: {
      "#owner": "ownerId",
      "#visible": "visible"
    },
    ExpressionAttributeValues: {
      ":owner_id": req.params.ownerId,
      ":val": 1
    }
  };

  res.set('Access-Control-Allow-Origin', '*');

  docClient.query(params, function(err, data) {
    if (err) {
      console.error("Unable to Query. Error:", JSON.stringify(err, null, 2));
      res.send("Unable to Query. Error:", JSON.stringify(err, null, 2));
    } else {
      console.log("Query succeeded.");
      data.Items.sort(function(a, b) {
        return parseFloat(a.createdtime) - parseFloat(b.createdtime);
      });
      res.write(JSON.stringify(data, null, 2));
      res.end();
    }
  });
});

// gets all sensorgroups in an area
search.get('/sensorgroup_in_area/:areaId', function(req, res) {
  var params = {
    TableName: "Sensor_Group",
    KeyConditionExpression: "#area = :area_id",
    FilterExpression: "#visible = :val",
    ExpressionAttributeNames: {
      "#area": "areaId",
      "#visible": "visible"
    },
    ExpressionAttributeValues: {
      ":area_id": req.params.areaId,
      ":val": 1
    }
  };
  res.set('Access-Control-Allow-Origin', '*');

  docClient.query(params, function(err, data) {
    if (err) {
      console.error("Unable to Read. Error:", JSON.stringify(err, null, 2));
      res.send("Unable to Query. Error:", JSON.stringify(err, null, 2));
    } else {
      data.Items.sort(function(a, b) {
        return parseFloat(a.createdtime) - parseFloat(b.createdtime);
      });
      res.send(JSON.stringify(data, null, 2));
    }
  });
});

// gets all sensors in sensorgroup
search.get('/sensors_in_group/:groupId', function(req, res) {
  var params = {
    TableName: "Sensors",
    KeyConditionExpression: "#group = :group_id",
    FilterExpression: "#visible = :val",
    ExpressionAttributeNames: {
      "#group": "groupId",
      "#visible": "visible"
    },
    ExpressionAttributeValues: {
      ":group_id": req.params.groupId,
      ":val": 1
    }
  };
  res.set('Access-Control-Allow-Origin', '*');

  docClient.query(params, function(err, data) {
    if (err) {
      console.error("Unable to Read. Error:", JSON.stringify(err, null, 2));
      res.send("Unable to Query. Error:", JSON.stringify(err, null, 2));
    } else {
      console.log("Get item succeeded.");
      data.Items.sort(function(a, b) {
        return parseFloat(a.createdtime) - parseFloat(b.createdtime);
      });
      res.send(JSON.stringify(data, null, 2));
    }
  });
});

//gets single sensor newest data
search.get('/sensors/:sensortype/:sensorid', function(req, res) {
  var d = new Date();
  var adjust = 3600*1000;

  var params = {
    TableName: req.params.sensortype,
    ProjectionExpression: "sensorId, #time_id, #v",
    KeyConditionExpression: "sensorId = :sensor_id and #time_id > :t1",
    ExpressionAttributeNames: {
      "#time_id": "timestamp",
      "#v": "value"
    },
    ExpressionAttributeValues: {
      ":sensor_id": req.params.sensorid,
      ":t1": (d.getTime() - adjust)
    }
  };

  res.set('Access-Control-Allow-Origin', '*');

  docClient.query(params, function(err, data) {
    if (err) {
      console.error("Unable to Query. Error:", JSON.stringify(err, null, 2));
    } else {
      console.log("Query succeeded.");
      data.Items.sort(function(a, b) {
        return parseFloat(a.timestamp) - parseFloat(b.timestamp);
      });
      length = data.Count;
      if (length > 0) {
        res.send(JSON.stringify(data.Items[length - 1], null, 2));
      }
      else {
        res.send("No data");
      }
    }
  });
});

//收水表最新數據
search.get('/meter/new/:sensorid', function(req, res) {
  var d = new Date();
  var adjust = 3600*1000;

  var params = {
    TableName: "METER",
    ProjectionExpression: "sensorId, #time_id, #v",
    KeyConditionExpression: "sensorId = :sensor_id and #time_id > :t1",
    ExpressionAttributeNames: {
      "#time_id": "timestamp",
      "#v": "value"
    },
    ExpressionAttributeValues: {
      ":sensor_id": req.params.sensorid,
      ":t1": (d.getTime() - adjust)
    }
  };

  res.set('Access-Control-Allow-Origin', '*');

  docClient.query(params, function(err, data) {
    if (err) {
      console.error("Unable to Query. Error:", JSON.stringify(err, null, 2));
    } else {
      console.log("Query succeeded.");
      data.Items.sort(function(a, b) {
        return parseFloat(a.timestamp) - parseFloat(b.timestamp);
      });
      length = data.Count;
      if (length >= 2) {
        //用最後兩筆差異算出最新澆水量
        var amount = (data.Items[length-1].value - data.Items[length-2].value) * 1000;
        res.send(JSON.stringify(amount, null, 2));
      }
      else {
        res.send("無數據");
      }
    }
  });
});

//use type and num and macAddr search single sensorId
// search.get('/sensors/single/:macAddr/:sensorType/:num', function(req, res) {
//   var params = {
//     TableName: "Sensors",
//     FilterExpression: "#type = :type and #num = :num and #macAddr = :macAddr and #visible = :val",
//     ProjectionExpression: "sensorId",
//     ExpressionAttributeNames: {
//       "#type": "sensorType",
//       "#num": "num",
//       "#macAddr": "macAddr",
//       "#visible": "visible"
//     },
//     ExpressionAttributeValues: {
//       ":type": req.params.sensorType,
//       ":num": req.params.num,
//       ":macAddr": req.params.macAddr,
//       ":val": 1
//     }
//   };

//   res.set('Access-Control-Allow-Origin', '*');

//   docClient.scan(params, onScan);

//   function onScan(err, data) {
//     if (err) {
//       console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
//     } else {
//       // print all the movies
//       console.log("Scan succeeded.");
//       res.send(data.Items[0].sensorId);
//       if (typeof data.LastEvaluatedKey != "undefined") {
//         console.log("Scanning for more...");
//         params.ExclusiveStartKey = data.LastEvaluatedKey;
//         docClient.scan(params, onScan);
//       }
//     }
//   }
// });

//算sensorhub內同種類的感測器有幾個，用於計算感測器編號
search.get('/sensors/num/:macAddr/:sensorType', function(req, res) {
  var params = {
    TableName: "Sensors",
    FilterExpression: "#type = :type and #macAddr = :macAddr and #visible = :val",
    ExpressionAttributeNames: {
      "#macAddr": "macAddr",
      "#type": "sensorType",
      "#visible": "visible"
    },
    ExpressionAttributeValues: {
      ":macAddr": req.params.macAddr,
      ":type": req.params.sensorType,
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
      var max = 0;
      for(let i=0;i<data.Count;i++){
        var num = parseInt(data.Items[i].num);
        if(num > max){
          max = num;
        }
      }
      max += 1;
      res.send(max.toString());
      if (typeof data.LastEvaluatedKey != "undefined") {
        console.log("Scanning for more...");
        params.ExclusiveStartKey = data.LastEvaluatedKey;
        docClient.scan(params, onScan);
      }
    }
  }
});

// gets all sensors with same owner
search.get('/sensors_owned/:ownerId', function(req, res) {
  var params = {
    TableName: "Sensors",
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

module.exports = search;
