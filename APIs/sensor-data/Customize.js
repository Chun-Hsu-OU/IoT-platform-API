var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");
var regression = require('regression');

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
      res.status(404).send("Unable to Query. Error");
    } else {
      console.log("Query succeeded.");
      // 有查到資料才補
      if(data.Count > 0){
        /* 檢查有無中斷數據，如果中斷1小時以上，以自訂時間區間補齊，數據值 = null */

        //自訂時間間隔(分鐘)
        var interval = 12;
        //紀錄開始中斷的數據時間(可能斷好幾個)
        var times = [];
        for(let i=0; i<data.Items.length; i++){
          //因為最後一筆沒有下一筆，所以不能比較
          if(i != data.Items.length-1){
              //如果發現這筆資料跟下筆資料相差1小時以上，代表有中斷數據，就先把timestamp記錄下來
              if((data.Items[i+1].timestamp - data.Items[i].timestamp) >= (3600*1000)){
                  times.push(data.Items[i].timestamp);   
              }
            }
        }

        //補齊中斷時間內的數據(null)
        for(let i=0; i<times.length; i++){
            //依照之前紀錄的timestamp去查在data的第幾個index(因為中間會插入資料，所以index會變，所以才要用查的方式)
            var index = data.Items.findIndex(function (x) { return x.timestamp == times[i] });
            //開始斷的時間
            var now_value = data.Items[index].timestamp;
            //結束斷的時間
            var next_value = data.Items[index+1].timestamp;
            //算有幾個時間間隔
            var count = Math.floor((next_value - now_value) / (interval*60*1000));
            
            //開始補數據
            for(let j=0; j<count; j++){
                now_value += (interval*60*1000);
                //不要跟結束時間重複
                if(now_value != next_value){
                  var item = {
                    "timestamp": now_value,
                    "value": null
                  }
                  //插入數據
                  data.Items.splice(index+1+j, 0, item);
                }	
            }
        }

        //檢查前面是否有中斷數據
        var begin = Number(req.params.begin);
        //一開始跟選擇開始的時間有差距1小時以上，代表有中斷數據
        if((data.Items[0].timestamp - begin) >= (3600*1000)){
          //算有幾個時間間隔
          var count = Math.floor((data.Items[0].timestamp - begin) / (interval*60*1000));
          for(let i=0; i<count; i++){
            begin += (interval*60*1000);
            var item = {
              "timestamp": begin,
              "value": null
            }
            //插入數據
            data.Items.splice(i, 0, item);
          }
        }        
      }

      res.send(JSON.stringify(data, null, 2));
    }
  });
});

// 線性回歸
custom.get('/linear/:sensortype/:sensorid/:begin/:end', function(req, res) {
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
        var interval = 1.5;
        //記錄所有斜率資料(from、to、slope)
        var all_outcome = [];
        var begin = Number(req.params.begin);
        var end = Number(req.params.end);
        while(begin <= end){
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
          }

          //計算下一個 自訂時間(小時)
          begin += interval*60*60*1000;
        }

        res.send(JSON.stringify(all_outcome, null, 2));
        console.log("/////////結束//////////"); 
        console.log("");
        console.log("");
      }
      
    }
  });
});

module.exports = custom;
