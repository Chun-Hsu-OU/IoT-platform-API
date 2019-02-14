const YAML = require('yamljs');
const fs = require("fs");
var path = require('path');

// 要用到的function
var methods = require('./methods');

// 要偵測的所有sensorhub的id
var sensorhub = YAML.parse(fs.readFileSync(path.join(__dirname, './config') + '/sensorhub.yml').toString());
// 要偵測的所有sensortype
var sensortype = YAML.parse(fs.readFileSync(path.join(__dirname, './config') + '/sensortype.yml').toString());

//API網址
var api_url = "http://nthu-smart-farming.kits.tw:3000/";

//一次偵測的時間長度(小時)
var interval = 1.5;

//一開始馬上偵測一次
detect();

//之後固定時間 週期性偵測
// setInterval(function(){
//     detect(); 
// }, 12*60*1000);

//需要等token傳回才能繼續
async function detect() {
    //每次request都要帶token才能拿資料
    var token = await methods.getToken(api_url+"api/account/login/");

    var d = new Date();
    // var toEpoch = d.getTime();
    // var fromEpoch = toEpoch - (interval*60*60*1000);
    var toEpoch = 1547910000000;
    var fromEpoch = 1547740800000;
    
    //輪到判斷哪個type
    for(let type_num=0; type_num<sensortype.length; type_num++){
        
        //儲存同一種類sensor的所有斜率資料
        var multi_line_slopes = [];

        //挑出sensorhub中一樣type的sensor，檢查是否異常
        for(let group_num=0; group_num < sensorhub.pingtung.length; group_num++){
            var sensorhub_info = await methods.httpGet(api_url+"api/sensors_in_group/"+sensorhub.pingtung[group_num], token);
            
            for(let sensor_num=0; sensor_num < sensorhub_info.Items.length; sensor_num++){
                var sensor = sensorhub_info.Items[sensor_num];
                
                //判斷是要偵測的type就開始算sensor在這個時間區段的斜率
                if(sensor.sensorType == sensortype[type_num]){
                    var one_line_slopes = await methods.httpGet(api_url + 'api/linear/' + sensor.sensorType + '/' + sensor.sensorId + '/' + fromEpoch + '/' + toEpoch, token);
                    multi_line_slopes.push(one_line_slopes);
                }
            }
        }
        console.log("----------------------------------");
        console.log(sensortype[type_num]);
        console.log();
        console.log(multi_line_slopes);
        console.log();

        //開始偵測異常
        methods.detect_abnormal(multi_line_slopes, token);
    }
}