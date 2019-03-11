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

// 拿一個owner下所有area資料
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

// 拿一個area下所有sensorhub資料
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

// 拿一個sensorhub下所有sensor資料
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

// 只搜尋sensorhub名稱
search.get('/sensor_group/name/:groupId', function(req, res) {
  var params = {
    TableName: "Sensor_Group",
    ProjectionExpression: "#name",
    FilterExpression: "#group = :group_id",
    ExpressionAttributeNames: {
      "#name": "name",
      "#group": "groupId"
    },
    ExpressionAttributeValues: {
      ":group_id": req.params.groupId
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
      res.send(JSON.stringify(data.Items[0].name, null, 2));

      if (typeof data.LastEvaluatedKey != "undefined") {
        console.log("Scanning for more...");
        params.ExclusiveStartKey = data.LastEvaluatedKey;
        docClient.scan(params, onScan);
      }
    }
  }
});

// 拿一個sensor最新的數據
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

// 收水表最新澆水量
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
        res.send("no data");
      }
    }
  });
});

// 取得一段時間內所有的每次澆水量
search.get('/meter/interval/:sensorid/:begin/:end', function(req, res) {
  var params = {
    TableName: "METER",
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
      if(data.Count >= 2){
        //存放每一次澆水量資料
        var amounts_in_interval = {};
        var Items = [];
        for(let i=0; i<data.Count; i++){
          var obj = {};
          if(i != data.Count-1){
            var water_amount = (data.Items[i+1].value - data.Items[i].value) * 1000;
            obj.value = water_amount;
            obj.sensorId = req.params.sensorid;
            obj.timestamp = data.Items[i+1].timestamp;
            Items.push(obj);
          }
        }
        amounts_in_interval.Items = Items;
        amounts_in_interval.Count = Items.length;
        res.send(JSON.stringify(amounts_in_interval, null, 2));
      }else{
        res.send("no data");
      }
    }
  });
});

// 算sensorhub內同種類的感測器有幾個，用於計算感測器編號
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

// 拿一個owner下所有的sensor資料
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
