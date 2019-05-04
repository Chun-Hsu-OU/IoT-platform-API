var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");
var regression = require('regression');

var analysis = express.Router();

analysis.use(bodyParser.urlencoded({
  extended: true
}));

analysis.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

// 可調整偵測範圍的線性回歸
analysis.get('/linear/:interval/:sensortype/:sensorid/:begin/:end', function(req, res) {
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
      res.status(404).send("Unable to Query. Error");
    } else {
      if(data.Count > 0){
        //自訂時間(小時)
        var interval = parseFloat(req.params.interval);
        //記錄所有斜率資料(from、to、slope)
        var all_outcome = [];
        
        var begin = Number(req.params.begin);
        var end = Number(req.params.end);
        while(begin < end){
          //每次要計算的區間結束時間(暫時)
          var temp_end = 0;
          //判斷是否加上 自訂時間(小時) 後會超出原本的結束時間
          if( (begin+(interval*60*60*1000)) <= end){
            temp_end = begin+(interval*60*60*1000);
          }else{
            //不足 自訂時間(小時) 就不算，因為有些有資料有些沒資料，算出來資料筆數會不一樣
            break;
          }

          //挑出要處理的 自訂時間(小時) 內資料
          var data_in_interval = [];
          for(let i=0; i<data.Items.length; i++){
            if(data.Items[i].timestamp >= begin && data.Items[i].timestamp <= temp_end){
              data_in_interval.push(data.Items[i]);
            }
          }
          
          //自訂時間(小時) 內有資料再處理
          if(data_in_interval.length != 0){
            console.log("from: "+begin);
            console.log("to: "+temp_end);
            console.log("");
    
            if(data_in_interval.length > 5){
              //資料較完整，可以算斜率

              /*
                自訂時間(小時) 內資料變成dataset給線性回歸使用
                dataset元素:
                1. index
                2. value
              */
              var dataset = [];
              for(let i=0; i<data_in_interval.length; i++){
                var pair = [];
                pair[0] = i;
                pair[1] = parseFloat(data_in_interval[i].value);
                dataset.push(pair);
              }
              console.log(dataset);

              //使用線性回歸，計算斜率
              var result = regression.linear(dataset);
              var slope = result.equation[0];
              var yIntercept = result.equation[1];
              console.log("y = "+slope+"x + "+yIntercept);
              console.log("----------------------------------");

              //將這段時間的結果放進 all_outcome 陣列
              var obj = {};
              obj.sensorId = req.params.sensorid;
              obj.from = begin;
              obj.to = temp_end;
              obj.slope = slope;
              all_outcome.push(obj);
            }else{
              //資料不完整，算出的斜率也不正確，所以設slope = x
              var obj = {};
              obj.sensorId = req.params.sensorid;
              obj.from = begin;
              obj.to = temp_end;
              obj.slope = "x";
              all_outcome.push(obj);
            }
            
          }

          //計算下一個 自訂時間(小時)
          begin += interval*60*60*1000;
        }

        res.send(JSON.stringify(all_outcome, null, 2));
        console.log("/////////結束//////////"); 
        console.log("");
        console.log("");
      }else{
        res.send("No data");
      }
      
    }
  });
});

// 計算sensor平均多久送一次資料(分鐘)和計算偵測範圍(小時)
analysis.get('/sensor/cal_avg_interval/:sensortype/:sensorid', function(req, res) {
  var d = new Date();
  //抓2小時內數據計算
  var adjust = 7200*1000;

  var params = {
    TableName: req.params.sensortype,
    ProjectionExpression: "#time_id",
    KeyConditionExpression: "sensorId = :sensor_id and #time_id > :t1",
    ExpressionAttributeNames: {
      "#time_id": "timestamp"
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
      if (length > 2) {
        var total_time = 0;
        // var times = [];
        for(let i=0; i<length; i++){
            //最後一筆資料沒有下一筆(i+1)資料可以算
            if(i != length-1){
                //轉為分鐘
                var interval = (data.Items[i+1].timestamp - data.Items[i].timestamp) / 1000 / 60;
                total_time += interval;
                // times.push(interval);
            }
        }
        //ex: 5筆資料 -> 只有4個間隔，所以要 length - 1
        var avg_interval = Math.ceil(total_time / (length-1)); //分鐘
        var detect_range = (avg_interval * 7) / 60; //小時
        var pair = [];
        pair[0] = avg_interval;
        pair[1] = parseFloat(detect_range.toFixed(2));

        // var obj = {};
        // obj.times = times;
        // obj.avg = total_time / (length-1);
        // obj.pair = pair;
        res.send(JSON.stringify(pair, null, 2));
      }
      else {
        res.send("No data");
      }
    }
  });
});

analysis.get('/abnormal/data_in_interval/:sensorid/:from/:to', function(req, res) {
  var params = {
    TableName: "Abnormal_data",
    ProjectionExpression: "sensorId, #from, #to, #state, #name",
    KeyConditionExpression: "sensorId = :sensor_id and #from >= :from",
    FilterExpression: "#to <= :to",
    ExpressionAttributeNames: {
      "#from": "from_time",
      "#to": "to_time",
      "#state": "state",
      "#name": "sensor_name"
    },
    ExpressionAttributeValues: {
      ":sensor_id": req.params.sensorid,
      ":from": Number(req.params.from),
      ":to": Number(req.params.to)
    }
  };

  res.set('Access-Control-Allow-Origin', '*');
  docClient.query(params, function(err, data) {
    if (err) {
      console.error("Unable to Query. Error:", JSON.stringify(err, null, 2));
      res.status(404).send("Unable to Query. Error");
    } else {
      console.log("Query succeeded.");
      if(data.Count > 0){
        res.send(JSON.stringify(data, null, 2));
      }else{
        res.send("No data");
      }
    }
  });
});

module.exports = analysis;