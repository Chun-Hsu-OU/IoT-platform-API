var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");
var rp = require('request-promise');

var custom = express.Router();

custom.use(bodyParser.urlencoded({
  extended: true
}));

custom.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var api_url = "http://127.0.0.1:3000/";
// var api_url = "http://nthu-smart-farming.kits.tw:3000/";

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
      if(req.params.sensortype == "METER"){ /* 水錶 */

        //轉到查詢每次用水量api,收到資料後再傳出
        every_water_amounts(req.params.sensorid, Number(req.params.begin), Number(req.params.end), res);
      
      }else{   /* 一般sensor */
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

    }
  });
});

// call 每次用水量api
async function every_water_amounts(sensorid, begin, end, res){
  var token = await getToken();
  var water_amounts = await httpGet(api_url+"api/meter/interval/"+sensorid+"/"+begin+"/"+end, token);
  res.send(JSON.stringify(water_amounts, null, 2));
}

/*-------------------------------------
功用: 從登入 api 取得 token
--------------------------------------*/
function getToken() {
  var options = {
      method: 'POST',
      uri: api_url+"api/account/login/",
      body: {
          "email": "test123",
          "password": "test123"
      },
      json: true
  };

  return rp(options)
  .then(function(response) {
      return response.token;
  })
  .catch(function(err) {
      console.log("ERR: "+err);
  });
}

/*-------------------------------------
功用: 執行http get方法
Arg:
  param1（array）: 要 get 的 api 網址
  param2（str）: 由登入得到的JWT token 
--------------------------------------*/
function httpGet(url, token) {
  var options = {
      method: 'GET',
      uri: url,
      headers: {
          'token': token
      },
      json: true
  };

  return rp(options)
  .then(function(response) {
      return response;
  })
  .catch(function(err) {
      console.log("ERR: "+err);
  });
}

module.exports = custom;
