var rp = require('request-promise');
//API網址
var api_url = "http://nthu-smart-farming.kits.tw:3000/";

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
Arg:
    param1（str）: 登入的 api 網址
--------------------------------------*/
function getToken(url) {
    var options = {
        method: 'POST',
        uri: url,
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
功用: 存一筆異常資料進資料庫
Arg:
    param1（str）: 存異常資料的 api 網址
--------------------------------------*/
function save_abnormal_data(url, token, sensorId, from_time, to_time, state) {
    var options = {
        method: 'POST',
        uri: url,
        headers: {
            'token': token
        },
        body: {
            "sensorId": sensorId,
            "from_time": from_time,
            "to_time": to_time,
            "state": state  
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

/*-------------------------------------
功用: 算平均值
Arg:
    param1（array）: 要算的array
--------------------------------------*/
Math.mean = function(array){
    return array.reduce(function(a, b){ return a+b; })/array.length;
}

/*-------------------------------------
功用: 算標準差
Arg:
    param1（array）: 要算的array
--------------------------------------*/
Math.stDeviation=function(array){
    var mean= Math.mean(array),
    dev= array.map(function(itm){return (itm-mean)*(itm-mean); });
    return Math.sqrt(dev.reduce(function(a, b){ return a+b; })/array.length);
}

/*-------------------------------------
功用: 算中位數
Arg:
    param1（array）: 要算的array
--------------------------------------*/
function median_number(values){
  values.sort(function(a,b){
    return a-b;
  });

  if(values.length === 0) return 0

  var half = Math.floor(values.length / 2);

  if (values.length % 2) // 奇數
    return values[half];
  else // 偶數
    return (values[half - 1] + values[half]) / 2.0;
}

/*-------------------------------------
功用: 偵測哪個sensor的數據異常
Arg:
    param1（array）: 要偵測的二維陣列，裡面一維陣列都是各別sensor時間範圍內的資料
    param2（str）: 由登入得到的JWT token
--------------------------------------*/
function detect_abnormal(array, token){
    
    var col_length = array[0].length;

    //一次跑一組(同一行)相同時間sensors偵測異常趨勢
    for(let col=0; col<col_length; col++){

        //挑出不同線同一時段的slope，用於計算標準差，算出四分位數上限和下限
        var same_time_interval_slopes = [];
        //挑出不同線同一時段的所有資料(sensorId, from, to, slope)，在發生異常時，可以將資料儲存進資料庫
        var all_info_slopes = [];

        for(let row=0; row<array.length; row++){
            same_time_interval_slopes.push(array[row][col].slope);
            all_info_slopes.push(array[row][col]);
        }
        console.log(same_time_interval_slopes);

        /*------------------------------------------
          以下為四分位數算法
          1.目的：
            算出異常大於或小於常態分佈的數字，可以挑出異常值
          2.算法：
            σ：標準差
            Md：中位數
            常態分佈上限：Md + 2.698σ (大於就挑出)
            常態分佈下限：Md - 2.698σ (小於就挑出)
        -------------------------------------------*/
        //計算中位數
        var median = median_number(same_time_interval_slopes);
        console.log("中位數: "+median);
        
        //計算標準差
        var std = Math.stDeviation(same_time_interval_slopes);
        console.log("標準差: "+std);
        
        //常態分佈上限
        var top_normal_limit = median + 2.698*std;
        //常態分佈下限
        var bottom_normal_limit = median - 2.698*std;
        console.log("from: "+timeConverter(all_info_slopes[0].from));
        console.log("to: "+timeConverter(all_info_slopes[0].to));
        console.log("top: "+top_normal_limit);
        console.log("bottom: "+bottom_normal_limit);
        

        for(let index=0; index<all_info_slopes.length; index++){
            var test_value = all_info_slopes[index].slope;

            var sensorId = all_info_slopes[index].sensorId;
            var from_time = all_info_slopes[index].from;
            var to_time = all_info_slopes[index].to;

            // state: 1 -> 過高 ， 0 -> 過低
            if(test_value > top_normal_limit){
                console.log("sensorId: "+all_info_slopes[index].sensorId);
                console.log("異常狀況： 過高！");
                save_abnormal_data(api_url+"api/add/abnormal/data", token, sensorId, from_time, to_time, 1);
            }
            if(test_value < bottom_normal_limit){
                console.log("sensorId: "+all_info_slopes[index].sensorId);
                console.log("異常狀況: 過低！");
                save_abnormal_data(api_url+"api/add/abnormal/data", token, sensorId, from_time, to_time, 0);
            }
        }
        console.log("--------------------------------");
    }
}

function timeConverter(UNIX_timestamp){
    var a = new Date(UNIX_timestamp);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
    return time;
}

module.exports.httpGet = httpGet;
module.exports.getToken = getToken;
module.exports.detect_abnormal = detect_abnormal;

