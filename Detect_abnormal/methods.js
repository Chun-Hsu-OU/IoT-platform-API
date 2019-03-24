var rp = require('request-promise');
const fs = require('fs');

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

/*-------------------------------------
功用: 以四分位數從一堆斜率中挑出異常值
Arg:
    param1（arr）: 同一種類的sensors一段時間的斜率
    param2 (str) : 場域名稱
    param3 (str) : 從登入得到的JWT token
--------------------------------------*/
function filterOutlier(array, area, token){

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

            // state: 1 -> 過高 ， 0 -> 過低
            if(test_value > maxValue){
                console.log("異常值: "+test_value);
                console.log("場域: "+area);
                console.log("sensor 名稱: "+all_info_slopes[i].name);
                console.log("從: "+timeConverter(all_info_slopes[i].from));
                console.log("到: "+timeConverter(all_info_slopes[i].to));
                console.log(all_info_slopes[i].sensorId+" 異常上升");
                save_info.state = 1;
                save_abnormal_data(save_info, token);
            }
            if(test_value < minValue){
                console.log("異常值: "+test_value);
                console.log("場域: "+area);
                console.log("sensor 名稱: "+all_info_slopes[i].name);
                console.log("從: "+timeConverter(all_info_slopes[i].from));
                console.log("到: "+timeConverter(all_info_slopes[i].to));
                console.log(all_info_slopes[i].sensorId+" 異常下降");
                save_info.state = 0;
                save_abnormal_data(save_info, token);
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
module.exports.cal_period = cal_period;
module.exports.add_name_and_type = add_name_and_type;
module.exports.filterOutlier = filterOutlier;
module.exports.check_working = check_working;
