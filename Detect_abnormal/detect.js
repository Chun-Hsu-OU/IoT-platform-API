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
// var api_url = "http://127.0.0.1:3000/"

cycle_detect();

//對場域週期性異常偵測
async function cycle_detect(){
    var token = await methods.getToken();
    /*-------------------------------------
    函式: cal_period
    回傳: array
    內容:
        index0 : 兩小時內計算出來的感測器傳資料的平均間隔(分鐘)
        index1 : 至少包含7筆資料的偵測範圍(小時)
    --------------------------------------*/
    //屏東火龍果
    //檢查所有sensorhub下的sensor都有資料再進行偵測
    var check_pingtung = true;
    for(let group_num=0; group_num < sensorhub.pingtung.length; group_num++){
        var sensors_info = await methods.httpGet(api_url+"api/sensors_in_group/"+sensorhub.pingtung[group_num], token);    
        for(let sensor_num=0; sensor_num < sensors_info.Items.length; sensor_num++){
            var sensor = sensors_info.Items[sensor_num];
            //檢查sensorhub裡要偵測的種類是否有資料
            for(let type_num=0; type_num<sensortype.pingtung.length; type_num++){
                if(sensor.sensorType == sensortype.pingtung[type_num]){
                    var result = await methods.check_working(sensor.sensorType, sensor.sensorId, token);
                    if(result == "No data"){
                        check_pingtung = false;
                    }
                }
            }
        }
    }

    if(check_pingtung){
        console.log("火龍果 數據穩定!");
        //土壤溫度 B1
        var period_pingtung = await methods.cal_period("SOIL_TEMPERATURE", "3f18a50c-7584-41c1-80a3-3b0c24ca0c54", token);
        console.log(period_pingtung[1])
        detect_pingtung(period_pingtung[1]);
        setInterval(function(){
            detect_pingtung(period_pingtung[1]);
        }, period_pingtung[1]*60*60*1000);
    }else{
        console.log("火龍果 數據中斷 無法偵測!");
    }

    
    //新竹大平窩
    var check_dapingwo = true;
    for(let group_num=0; group_num < sensorhub.dapingwo.length; group_num++){
        var sensors_info = await methods.httpGet(api_url+"api/sensors_in_group/"+sensorhub.dapingwo[group_num], token);    
        for(let sensor_num=0; sensor_num < sensors_info.Items.length; sensor_num++){
            var sensor = sensors_info.Items[sensor_num];
            //檢查sensorhub裡要偵測的種類是否有資料
            for(let type_num=0; type_num<sensortype.dapingwo.length; type_num++){
                if(sensor.sensorType == sensortype.dapingwo[type_num]){
                    var result = await methods.check_working(sensor.sensorType, sensor.sensorId, token);
                    if(result == "No data"){
                        check_dapingwo = false;
                    }
                }
            }
        }
    }

    if(check_dapingwo){
        console.log("大平窩 數據穩定!");
        //土壤溫度 B5 1
        var period_dapingwo = await methods.cal_period("SOIL_TEMPERATURE", "6976f093-d7ca-4822-b260-63ecf1373b9f", token);
        console.log(period_dapingwo);
        detect_dapingwo(period_dapingwo[1]);
        setInterval(function(){
            detect_dapingwo(period_dapingwo[1]);
        }, period_dapingwo[1]*60*60*1000);
    }else{
        console.log("大平窩 數據中斷 無法偵測!");
    }

    //屏東江夏
    var check_jiangxia = true;
    for(let group_num=0; group_num < sensorhub.jiangxia.length; group_num++){
        var sensors_info = await methods.httpGet(api_url+"api/sensors_in_group/"+sensorhub.jiangxia[group_num], token);    
        for(let sensor_num=0; sensor_num < sensors_info.Items.length; sensor_num++){
            var sensor = sensors_info.Items[sensor_num];
            //檢查sensorhub裡要偵測的種類是否有資料
            for(let type_num=0; type_num<sensortype.jiangxia.length; type_num++){
                if(sensor.sensorType == sensortype.jiangxia[type_num]){
                    var result = await methods.check_working(sensor.sensorType, sensor.sensorId, token);
                    if(result == "No data"){
                        check_jiangxia = false;
                    }
                }
            }
        }
    }

    if(check_jiangxia){
        console.log("江夏 數據穩定!");
        //土壤溫度 A1
        var period_jiangxia = await methods.cal_period("SOIL_TEMPERATURE", "4d011db6-72b9-43b7-a83e-3b656ca509a9", token);
        console.log(period_jiangxia);
        detect_jiangxia(period_jiangxia[1]);
        setInterval(function(){
            detect_jiangxia(period_jiangxia[1]);
        }, period_jiangxia[1]*60*60*1000);
    }else{
        console.log("江夏 數據中斷 無法偵測!");
    }
    
}

async function detect_pingtung(period) {
    //每次request都要帶token才能拿資料
    var token = await methods.getToken();

    var d = new Date();
    var toEpoch = d.getTime();
    var fromEpoch = toEpoch - (period*60*60*1000);
    // var toEpoch = 1547910000000;
    // var fromEpoch = 1547740800000;
    
    //輪到判斷哪個type
    for(let type_num=0; type_num<sensortype.pingtung.length; type_num++){
        
        //儲存同一種類sensor的所有斜率資料
        var multi_line_slopes = [];

        //挑出sensorhub中一樣type的sensor，檢查是否異常
        for(let group_num=0; group_num < sensorhub.pingtung.length; group_num++){
            var hub_name = await methods.httpGet(api_url+"api/sensor_group/name/"+sensorhub.pingtung[group_num], token);
            console.log("hub_name: "+hub_name);
            var sensors_info = await methods.httpGet(api_url+"api/sensors_in_group/"+sensorhub.pingtung[group_num], token);
            
            for(let sensor_num=0; sensor_num < sensors_info.Items.length; sensor_num++){
                var sensor = sensors_info.Items[sensor_num];
                
                //判斷是要偵測的type就開始算sensor在這個時間區段的斜率
                if(sensor.sensorType == sensortype.pingtung[type_num]){
                    var one_line_slopes = await methods.httpGet(api_url + 'api/linear/' + period +'/' + sensor.sensorType + '/' + sensor.sensorId + '/' + fromEpoch + '/' + toEpoch, token);
                    methods.add_name_and_type(one_line_slopes, hub_name+" "+sensor.num, sensor.sensorType);
                    multi_line_slopes.push(one_line_slopes);
                }
            }
        }
        console.log("----------------------------------");
        console.log(sensortype.pingtung[type_num]);
        console.log();
        console.log(multi_line_slopes);
        console.log();

        //開始偵測異常
        methods.filterOutlier(multi_line_slopes, "火龍果", token);
    }
}

async function detect_dapingwo(period) {
    //每次request都要帶token才能拿資料
    var token = await methods.getToken();

    var d = new Date();
    var toEpoch = d.getTime();
    var fromEpoch = toEpoch - (period*60*60*1000);

    //輪到判斷哪個type
    for(let type_num=0; type_num<sensortype.dapingwo.length; type_num++){
        
        //儲存同一種類sensor的所有斜率資料
        var multi_line_slopes = [];

        //挑出sensorhub中一樣type的sensor，檢查是否異常
        for(let group_num=0; group_num < sensorhub.dapingwo.length; group_num++){
            var hub_name = await methods.httpGet(api_url+"api/sensor_group/name/"+sensorhub.dapingwo[group_num], token);
            console.log("hub_name: "+hub_name);
            var sensors_info = await methods.httpGet(api_url+"api/sensors_in_group/"+sensorhub.dapingwo[group_num], token);
            
            for(let sensor_num=0; sensor_num < sensors_info.Items.length; sensor_num++){
                var sensor = sensors_info.Items[sensor_num];
                
                //判斷是要偵測的type就開始算sensor在這個時間區段的斜率
                if(sensor.sensorType == sensortype.dapingwo[type_num]){
                    var one_line_slopes = await methods.httpGet(api_url + 'api/linear/' + period +'/' + sensor.sensorType + '/' + sensor.sensorId + '/' + fromEpoch + '/' + toEpoch, token);
                    methods.add_name_and_type(one_line_slopes, hub_name+" "+sensor.num, sensor.sensorType);
                    multi_line_slopes.push(one_line_slopes);
                }
            }
        }
        console.log("----------------------------------");
        console.log(sensortype.dapingwo[type_num]);
        console.log();
        console.log(multi_line_slopes);
        console.log();

        //開始偵測異常
        methods.filterOutlier(multi_line_slopes, "大平窩", token);
    }
}

async function detect_jiangxia(period) {
    //每次request都要帶token才能拿資料
    var token = await methods.getToken();

    var d = new Date();
    var toEpoch = d.getTime();
    // var toEpoch = 1552108800000;
    var fromEpoch = toEpoch - (period*60*60*1000);

    //輪到判斷哪個type
    for(let type_num=0; type_num<sensortype.jiangxia.length; type_num++){
        
        //儲存同一種類sensor的所有斜率資料
        var multi_line_slopes = [];

        //挑出sensorhub中一樣type的sensor，檢查是否異常
        for(let group_num=0; group_num < sensorhub.jiangxia.length; group_num++){
            var hub_name = await methods.httpGet(api_url+"api/sensor_group/name/"+sensorhub.jiangxia[group_num], token);
            console.log("hub_name: "+hub_name);
            var sensors_info = await methods.httpGet(api_url+"api/sensors_in_group/"+sensorhub.jiangxia[group_num], token);
            
            for(let sensor_num=0; sensor_num < sensors_info.Items.length; sensor_num++){
                var sensor = sensors_info.Items[sensor_num];
                
                //判斷是要偵測的type就開始算sensor在這個時間區段的斜率
                if(sensor.sensorType == sensortype.jiangxia[type_num]){
                    var one_line_slopes = await methods.httpGet(api_url + 'api/linear/' + period +'/' + sensor.sensorType + '/' + sensor.sensorId + '/' + fromEpoch + '/' + toEpoch, token);
                    methods.add_name_and_type(one_line_slopes, hub_name+" "+sensor.num, sensor.sensorType);
                    multi_line_slopes.push(one_line_slopes);
                }
            }
        }
        console.log("----------------------------------");
        console.log(sensortype.jiangxia[type_num]);
        console.log();
        console.log(multi_line_slopes);
        console.log();

        //開始偵測異常
        methods.filterOutlier(multi_line_slopes, "江夏", token);
    }
}

