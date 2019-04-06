var admin = require("firebase-admin");
var rp = require('request-promise');
var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");

var serviceAccount = require(__dirname+"/firebase/fir-storage-sdk.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://hsnl-lab-usage.firebaseio.com"
});

// var api_url = "http://127.0.0.1:3000/";
var api_url = "http://nthu-smart-farming.kits.tw:3000/";

var unlencodedParser = bodyParser.urlencoded({
  extended: false
});

var forcast_time = express.Router();

forcast_time.use(bodyParser.json());

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "https://dynamodb.ap-northeast-2.amazonaws.com"
});

var docClient = new AWS.DynamoDB.DocumentClient();

// 拿一個sensor最新的數據
forcast_time.get('/forecast_time/:uuid/:sensorId', function(req, res) {
  var d = new Date();
  //先調成台灣時間，最後再改回unix time
  d = d.getTime() + 8*60*60*1000;
  d = new Date(d);
  console.log("現在時間: "+d);

  var hour = d.getHours();
  var minute = d.getMinutes();
  console.log("日期:"+d.getDate());
  console.log("小時:"+hour);
  console.log("分鐘:"+minute);
  var from = 0;
  var to = 0;
  if(hour >= 8){
    if(hour == 8){
      if(minute >= 40){
        // 拿當天8:00~8:40
        console.log(">= 8:40");
        d.setHours(8, 40, 0);
        to = d.getTime() - (8*60*60*1000);
        console.log(to);

        d.setMinutes(0);
        from = d.getTime() - (8*60*60*1000);
        console.log(from);
      }else{
        //拿前一天8:00~8:40
        console.log("< 8:40");
        var day = d.getDate();
        d.setDate(day-1);
        d.setHours(8, 40, 0);
        to = d.getTime() - (8*60*60*1000);
        console.log(to);

        d.setMinutes(0);
        from = d.getTime() - (8*60*60*1000);
        console.log(from);
      }
    }else{
      //拿當天8:00~8:40
      console.log("> 8點");
      d.setHours(8, 40, 0);
      to = d.getTime() - (8*60*60*1000);
      console.log(to);

      d.setMinutes(0);
      from = d.getTime() - (8*60*60*1000);
      console.log(from);
    }
  }else{
    //拿前一天8:00~8:40
    console.log("< 8點");
    var day = d.getDate();
    d.setDate(day-1);
    d.setHours(8, 40, 0);
    to = d.getTime() - (8*60*60*1000);
    console.log(to);

    d.setMinutes(0);
    from = d.getTime() - (8*60*60*1000);
    console.log(from);
  }

  var params = {
    TableName: "LIGHT_INTENSITY",
    ProjectionExpression: "sensorId, #time_id, #v",
    KeyConditionExpression: "sensorId = :sensorId and #time_id between :from and :to",
    ExpressionAttributeNames: {
      "#time_id": "timestamp",
      "#v": "value"
    },
    ExpressionAttributeValues: {
      ":sensorId": req.params.sensorId,
      ":from": from,
      ":to": to
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
        var time = 0.00186 * data.Items[0].value + 17.98;
        var message = "預測澆水時間: "+Math.floor(time)+"秒";
        console.log(data.Items[0].value);
        console.log(time);
        query_and_send_to_fcmTokens(req.params.uuid, message);
        res.send(JSON.stringify(Math.floor(time), null, 2));
      }else {
        query_and_send_to_fcmTokens(req.params.uuid, "目前無法預測澆水時間");
        res.send("No data");
      }
    }
  });
});

async function query_and_send_to_fcmTokens(uuid, message){
  var token = await getToken();
  var fcm_tokens = await httpGet(api_url+"api/fcm/search_binding/"+uuid, token);
  for(let i=0; i<fcm_tokens.length; i++){
      send_message(fcm_tokens[i], message);
  }
}

function send_message(fcm_token, message){
  var message = {
      notification: {
          title: "國立清華大學物聯網平台",
          body: message
      },
      token: fcm_token
  };

  admin.messaging().send(message)
      .then(function(response){
          console.log("Successfully sent message:", response);
      })
      .catch(function(error){
          console.log("Error sending message", error);
      });
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
  
module.exports = forcast_time;