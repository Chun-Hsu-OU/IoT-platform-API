var rp = require('request-promise');
var path = require('path'); // 引入路徑處理模組

var admin = require("firebase-admin");
var serviceAccount = require(path.resolve("../APIs/firebase/fir-storage-sdk.json"));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://hsnl-lab-usage.firebaseio.com"
});

//API網址
var api_url = "http://nthu-smart-farming.kits.tw:3000/";
// var api_url = "http://127.0.0.1:3000/";

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

function check_working(type ,id ,token){
    var options = {
        method: 'GET',
        uri: api_url+"api/sensors/"+type+"/"+id,
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

/*-------------------------------------
功用: 計算sensor平均多久送一次資料(分鐘)和計算偵測範圍(小時)
Arg:
    param1（str）: sensor種類
    param2（str）: sensor id
    param3（str）: 由登入得到的JWT token 
--------------------------------------*/
function cal_period(type ,id ,token) {
    var options = {
        method: 'GET',
        uri: api_url+"api/sensor/cal_avg_interval/"+type+"/"+id,
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

/*-------------------------------------
功用: 存一筆異常資料進資料庫
Arg:
    param1（obj）: 異常訊息, 包括area sensorId from_time to_time state sensor_type sensor_name
    param2 (str) : 從登入拿到的JWT token
--------------------------------------*/
function save_abnormal_data(info, token) {
    var options = {
        method: 'POST',
        uri: api_url+"api/add/abnormal/data",
        headers: {
            'token': token
        },
        body: {
            "area": info.area,
            "sensorId": info.sensorId,
            "from_time": info.from_time,
            "to_time": info.to_time,
            "state": info.state,
            "sensor_type": info.sensor_type,
            "sensor_name": info.sensor_name
        },
        json: true
    };

    rp(options)
    .then(function(response) {
        console.log(response);
    })
    .catch(function(err) {
        console.log("ERR: "+err);
    });
}

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
          title: "清華大學物聯網平台-異常狀況警報",
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

function area_to_uuid(area_name){
    uuid = "";
    if(area_name == "火龍果"){
        uuid = "73b8d82e-4d0a-4761-9590-c659ab0c0d13";
    }else if(area_name == "大平窩"){    
        uuid = "e0c97039-5f58-4453-942e-a008fc4bec9c";
    }

    return uuid;
}

/*-------------------------------------
功用: 以四分位數從一堆斜率中挑出異常值
Arg:
    param1（arr）: 同一種類的sensors一段時間的斜率
    param2 (str) : 場域名稱
    param3 (str) : sensor type
    param3 (str) : 從登入得到的JWT token
--------------------------------------*/
function filterOutlier(array, area, type, token){

    var col_length = array[0].length;

    //一次跑一組(同一行)相同時間sensors偵測異常趨勢
    for(let col=0; col<col_length; col++){

        //挑出不同線同一時段的slope
        var same_time_interval_slopes = [];
        //挑出不同線同一時段的所有資料(sensorId, from, to, slope)
        var all_info_slopes = [];

        for(let row=0; row<array.length; row++){
            same_time_interval_slopes.push(array[row][col].slope);
            all_info_slopes.push(array[row][col]);
        }
        console.log(same_time_interval_slopes);

        //先把資料不完整的挑出來儲存並刪除(slope = x)，才不會影響到後面計算四分位數
        for(let i=0; i<same_time_interval_slopes.length; i++){
            if(same_time_interval_slopes[i] == "x"){
                //要儲存的資料
                var save_info = {};
                save_info.area = area;
                save_info.sensor_type = all_info_slopes[i].type;
                save_info.sensor_name = all_info_slopes[i].name;
                save_info.sensorId = all_info_slopes[i].sensorId;
                save_info.from_time = all_info_slopes[i].from;
                save_info.to_time = all_info_slopes[i].to;          

                // state: 0 -> 過低，1 -> 過高 ，2 -> 資料不完整
                save_info.state = 2;
                save_abnormal_data(save_info, token);
                
                //傳送推播通知
                var messege = all_info_slopes[i].name + "在 " + 
                            timeConverter(all_info_slopes[i].from) + "~" + timeConverter(all_info_slopes[i].to) +
                            " 之間數據量過少\n可能感測器狀況不穩，之後有中斷數據的風險，需至現場檢查並維修";
                query_and_send_to_fcmTokens(area_to_uuid(area), messege);

                //刪除元素
                same_time_interval_slopes.splice(i, 1);
                all_info_slopes.splice(i, 1);
            }
        }

        var q1 = Quartile_25(same_time_interval_slopes);
        var q3 = Quartile_75(same_time_interval_slopes);
        var iqr = q3 - q1;
        console.log("q1: "+q1);
        console.log("q3: "+q3);
        console.log("iqr: "+iqr);

        // Then find min and max values
        var maxValue = q3 + iqr*1.5;
        var minValue = q1 - iqr*1.5;
        console.log("最大值: "+maxValue);
        console.log("最小值: "+minValue);

        var mean= Math.mean(same_time_interval_slopes);
        console.log("平均值: "+mean);
        //可能有異常
        var potential_anomaly = false;
        var threshold = 0;
        if(type == "SOIL_EC"){
            threshold = 10;
        }else{
            threshold = 1;
        }

        console.log("type: "+type);
        console.log("門檻值: "+threshold);
        for(let i=0; i<same_time_interval_slopes.length; i++){
            var test_value = Math.abs(same_time_interval_slopes[i] - mean);
            if(test_value > threshold){
                potential_anomaly = true;
            }
        }

        if(potential_anomaly){
            //挑出異常值
            for(let i=0; i<all_info_slopes.length; i++){
                var test_value = all_info_slopes[i].slope;

                //要儲存的資料
                var save_info = {};
                save_info.area = area;
                save_info.sensor_type = all_info_slopes[i].type;
                save_info.sensor_name = all_info_slopes[i].name;
                save_info.sensorId = all_info_slopes[i].sensorId;
                save_info.from_time = all_info_slopes[i].from;
                save_info.to_time = all_info_slopes[i].to;

                // state: 0 -> 過低，1 -> 過高 ，2 -> 資料不完整
                if(test_value < minValue){
                    console.log("異常值: "+test_value);
                    console.log("場域: "+area);
                    console.log("sensor 名稱: "+all_info_slopes[i].name);
                    console.log("從: "+timeConverter(all_info_slopes[i].from));
                    console.log("到: "+timeConverter(all_info_slopes[i].to));
                    console.log(all_info_slopes[i].sensorId+" 低於正常值");
                    save_info.state = 0;
                    save_abnormal_data(save_info, token);

                    //傳送推播通知
                    var messege = all_info_slopes[i].name + "在 " + 
                                timeConverter(all_info_slopes[i].from) + "~" + timeConverter(all_info_slopes[i].to) +
                                " 之間數據異常下降\n可能感測器有問題，需至現場檢查並維修";
                    query_and_send_to_fcmTokens(area_to_uuid(area), messege);
                }
                if(test_value > maxValue){
                    console.log("異常值: "+test_value);
                    console.log("場域: "+area);
                    console.log("sensor 名稱: "+all_info_slopes[i].name);
                    console.log("從: "+timeConverter(all_info_slopes[i].from));
                    console.log("到: "+timeConverter(all_info_slopes[i].to));
                    console.log(all_info_slopes[i].sensorId+" 高於正常值");
                    save_info.state = 1;
                    save_abnormal_data(save_info, token);

                    //傳送推播通知
                    var messege = all_info_slopes[i].name + "在 " + 
                                timeConverter(all_info_slopes[i].from) + "~" + timeConverter(all_info_slopes[i].to) +
                                " 之間數據異常上升\n可能感測器有問題，需至現場檢查並維修";
                    query_and_send_to_fcmTokens(area_to_uuid(area), messege);
                }
            }
        }
    }
}

function Quartile_25(data) {
    return Quartile(data, 0.25);
}

function Quartile_75(data) {
    return Quartile(data, 0.75);
}

function Quartile(data, q) {
    // Copy the values, rather than operating on references to existing values
    var values = data.concat();

    values=Array_Sort_Numbers(values);
    var pos = ((values.length) - 1) * q;
    var base = Math.floor(pos);
    var rest = pos - base;
    if( (values[base+1]!==undefined) ) {
        return values[base] + rest * (values[base+1] - values[base]);
    } else {
        return values[base];
    }
}

function Array_Sort_Numbers(inputarray){
    return inputarray.sort(function(a, b) {
        return a - b;
    });
}

Math.mean= function(array){
    return array.reduce(function(a, b){ return a+b; })/array.length;
}

/*-------------------------------------
功用: 加sensor名稱(sensorhub名稱+sensor編號)進去陣列的所有元素
Arg:
    param1（array）: 要加資訊的陣列，元素都是物件
    param2（str）: sensorhub 名稱
--------------------------------------*/
function add_name_and_type(array, name, type){
    for(let i=0; i<array.length; i++){
        var obj = array[i];
        obj.name = name;
        obj.type = type;
    }
}

function timeConverter(UNIX_timestamp){
    var a = new Date(UNIX_timestamp);
    var year = a.getFullYear();
    var month = "0" + (a.getMonth()+1);
    var date = "0" + a.getDate();
    var hours = "0" + a.getHours();
    var minutes = "0" + a.getMinutes();
    var seconds = "0" + a.getSeconds();
    var time = year + '/' + month.substr(-2) + '/' + date.substr(-2) + ' ' + hours.substr(-2) + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
    return time;
  }
  

module.exports.httpGet = httpGet;
module.exports.getToken = getToken;
module.exports.cal_period = cal_period;
module.exports.add_name_and_type = add_name_and_type;
module.exports.filterOutlier = filterOutlier;
module.exports.check_working = check_working;
