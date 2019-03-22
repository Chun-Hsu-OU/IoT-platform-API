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
    param2 (str) : 場域名稱
    param3 (str) : 從登入拿到的JWT token
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
                console.log("場域: "+area);
                console.log("sensor 名稱: "+all_info_slopes[i].name);
                console.log("從: "+timeConverter(all_info_slopes[i].from));
                console.log("到: "+timeConverter(all_info_slopes[i].to));
                console.log(all_info_slopes[i].sensorId+" 異常上升");
                save_info.state = 1;
                save_abnormal_data(save_info, token);
            }
            if(test_value < minValue){
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

        //發生異常時，存所有的異常資訊(之後會存到檔案)
        var log_text = "";

        //挑出不同線同一時段的slope，用於計算標準差，算出四分位數上限和下限
        var same_time_interval_slopes = [];
        //挑出不同線同一時段的所有資料(sensorId, from, to, slope)，在發生異常時，可以將資料儲存進資料庫
        var all_info_slopes = [];

        for(let row=0; row<array.length; row++){
            same_time_interval_slopes.push(array[row][col].slope);
            all_info_slopes.push(array[row][col]);
        }
        console.log(same_time_interval_slopes);
        log_text += same_time_interval_slopes.toString()+"\n";

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
        log_text += "中位數: "+median+"\n";
        
        //計算標準差
        var std = Math.stDeviation(same_time_interval_slopes);
        console.log("標準差: "+std);
        log_text += "標準差: "+std+"\n";
        
        //常態分佈上限
        var top_normal_limit = median + 2.698*std;
        //常態分佈下限
        var bottom_normal_limit = median - 2.698*std;
        console.log("from: "+timeConverter(all_info_slopes[0].from));
        console.log("to: "+timeConverter(all_info_slopes[0].to));
        console.log("top: "+top_normal_limit);
        console.log("bottom: "+bottom_normal_limit);
        log_text += "from: "+timeConverter(all_info_slopes[0].from)+"\n";
        log_text += "to: "+timeConverter(all_info_slopes[0].to)+"\n";
        log_text += "top: "+top_normal_limit+"\n";
        log_text += "bottom: "+bottom_normal_limit+"\n";
        

        for(let index=0; index<all_info_slopes.length; index++){
            var test_value = all_info_slopes[index].slope;

            var sensor_type = all_info_slopes[index].type;
            var sensor_name = all_info_slopes[index].name;
            var sensorId = all_info_slopes[index].sensorId;
            var from_time = all_info_slopes[index].from;
            var to_time = all_info_slopes[index].to;

            // state: 1 -> 過高 ， 0 -> 過低
            if(test_value > top_normal_limit){
                console.log("sensorId: "+all_info_slopes[index].sensorId);
                console.log("異常狀況： 過高！");
                log_text += "sensorId: "+all_info_slopes[index].sensorId+"\n";
                log_text += "異常狀況： 過高！"+"\n";
                log_text += "---------------------------\n\n";

                fs.appendFile("log_file", log_text, function(err) {
                    if(err) {
                        return console.log(err);
                    }
                });
                save_abnormal_data(sensor_type, sensor_name, sensorId, from_time, to_time, 1, token);
            }
            if(test_value < bottom_normal_limit){
                console.log("sensorId: "+all_info_slopes[index].sensorId);
                console.log("異常狀況: 過低！");
                log_text += "sensorId: "+all_info_slopes[index].sensorId+"\n";
                log_text += "異常狀況： 過低！"+"\n";
                log_text += "---------------------------\n\n";

                fs.appendFile("log_file", log_text, function(err) {
                    if(err) {
                        return console.log(err);
                    }
                });
                save_abnormal_data(sensor_type, sensor_name, sensorId, from_time, to_time, 0, token);
            }
        }
        console.log("--------------------------------");
    }
}

/*-------------------------------------
功用: 場域小於6條線使用的異常偵測
Arg:
    param1（array）: 要偵測的二維陣列，裡面一維陣列都是各別sensor時間範圍內的資料
    param2（str）: 由登入得到的JWT token
--------------------------------------*/
// function detect_data_less6(array, token){
//     var col_length = array[0].length;

//     //一次跑一組(同一行)相同時間sensors偵測異常趨勢
//     for(let col=0; col<col_length; col++){
//         //挑出不同線同一時段的slope，用於計算標準差，算出四分位數上限和下限
//         var same_time_interval_slopes = [];
//         //挑出不同線同一時段的所有資料(sensorId, from, to, slope)，在發生異常時，可以將資料儲存進資料庫
//         var all_info_slopes = [];

//         for(let row=0; row<array.length; row++){
//             same_time_interval_slopes.push(array[row][col].slope);
//             all_info_slopes.push(array[row][col]);
//         }
//         console.log(same_time_interval_slopes);


//         var rise = 0;
//         var fall = 0;
//         var around_zero = 0;
//         var state_count = [];
//         //分類
//         for(let i=0; i<same_time_interval_slopes.length; i++){
//             if(same_time_interval_slopes[i] >= -1 && same_time_interval_slopes[i] <= 1){
//                 around_zero++;
//             }else{
//                 if(same_time_interval_slopes[i] > 1){
//                     rise++;
//                 }else if(same_time_interval_slopes[i] < -1){
//                     fall++;
//                 }
//             }
//         }
//         //0:rise  1:fall  2:around_zero
//         state_count.push(rise, fall, around_zero);
//         console.log(state_count);

//         //如果有兩個state數量一樣，則無法判斷異常
//         if(!maxRepeat(state_count)){
//             //看誰佔比較多，回傳index
//             var leading = state_count.indexOf(Math.max(...state_count));
//             console.log("主導的index: "+leading);
//             console.log("------------------------------------");

//             for(let i=0; i<same_time_interval_slopes.length; i++){
//                 var sensor_type = all_info_slopes[i].type;
//                 var sensor_name = all_info_slopes[i].name;
//                 var sensorId = all_info_slopes[i].sensorId;
//                 var from_time = all_info_slopes[i].from;
//                 var to_time = all_info_slopes[i].to;

//                 console.log(sensor_type);
//                 console.log(sensor_name);
//                 console.log("from: "+timeConverter(all_info_slopes[i].from));
//                 console.log("to: "+timeConverter(all_info_slopes[i].to));

//                 if(leading == 0){
//                     if(same_time_interval_slopes[i] < 1){
//                         console.log("過低");
//                         console.log(all_info_slopes[i].sensorId);
//                         console.log(all_info_slopes[i].slope);
//                         save_abnormal_data(sensor_type, sensor_name, sensorId, from_time, to_time, 0, token);
//                     }
//                 }else if(leading == 1){
//                     if(same_time_interval_slopes[i] > -1){
//                         console.log("過高");
//                         console.log(all_info_slopes[i].sensorId);
//                         console.log(all_info_slopes[i].slope);
//                         save_abnormal_data(sensor_type, sensor_name, sensorId, from_time, to_time, 1, token);
//                     }
//                 }else if(leading == 2){
//                     if(same_time_interval_slopes[i] > 1){
//                         console.log("過高");
//                         console.log(all_info_slopes[i].sensorId);
//                         console.log(all_info_slopes[i].slope);
//                         save_abnormal_data(sensor_type, sensor_name, sensorId, from_time, to_time, 1, token);
//                     }
//                     if(same_time_interval_slopes[i] < -1){
//                         console.log("過低");
//                         console.log(all_info_slopes[i].sensorId);
//                         console.log(all_info_slopes[i].slope);
//                         save_abnormal_data(sensor_type, sensor_name, sensorId, from_time, to_time, 0, token);
//                     }
//                 }

//                 console.log("------------------------------------");
//             }
//         }else{
//             console.log("無法判斷異常");
//         }
//     }
// }



//判斷陣列中最大值是否有重複
// function maxRepeat(arr){
//     var max = Math.max(...arr);
//     var max_index = arr.indexOf(Math.max(...arr));
//     console.log("max: "+max);
//     console.log("max index: "+ max_index);
//     for (var i = 0; i < arr.length; i++) {
//         //如果元素也是最大值，就比對他是否跟原本算出來的最大值一樣位置，不是的話就是最大值重複
//         if(arr[i] == max){
//             console.log("find max index:"+i);
//             if(i != max_index){
//                 return true;
//             }
//         }
//     };
//     return false;
// }

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
module.exports.cal_period = cal_period;
module.exports.add_name_and_type = add_name_and_type;
module.exports.filterOutlier = filterOutlier;

