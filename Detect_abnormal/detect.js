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
    //檢查所有sensorhub下的sensor都有資料再進行偵測
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
    
}

async function detect_pingtung(period) {
    //每次request都要帶token才能拿資料
    var token = await methods.getToken();

    var d = new Date();
    var toEpoch = d.getTime();
    var fromEpoch = toEpoch - (period*60*60*1000);
    
    //輪到判斷哪個type
    for(let type_num=0; type_num<sensortype.pingtung.length; type_num++){
        
        console.log("----------------------------------");
        //儲存同一種類sensor的所有斜率資料
        var multi_line_slopes = [];

        //BATTERY_VOLTAGE使用
        voltages_of_each_batteries = [];
        battery_hub_name = [];
        //----------------------------

        //挑出sensorhub中一樣type的sensor，檢查是否異常
        for(let group_num=0; group_num < sensorhub.pingtung.length; group_num++){
            var hub_name = await methods.httpGet(api_url+"api/sensor_group/name/"+sensorhub.pingtung[group_num], token);
            console.log("hub_name: "+hub_name);
            var sensors_info = await methods.httpGet(api_url+"api/sensors_in_group/"+sensorhub.pingtung[group_num], token);
            
            if(sensortype.pingtung[type_num] == "BATTERY_VOLTAGE"){

                for(let sensor_num=0; sensor_num<sensors_info.Items.length; sensor_num++){
                    var sensor = sensors_info.Items[sensor_num];
                    if(sensor.sensorType == "BATTERY_VOLTAGE"){
                        var voltages = await methods.httpGet(api_url + 'api/sensors_in_timeinterval/' + sensor.sensorType + '/' + sensor.sensorId + '/' + fromEpoch + '/' + toEpoch + '?token=' + token);
                        if(voltages.Count > 0){
                            var one_voltages_set = [];
                            for(let k=0; k<voltages.Items.length; k++){
                                one_voltages_set.push(voltages.Items[k]);
                            }
                            voltages_of_each_batteries.push(one_voltages_set);
                            //當有電壓值時，另外紀錄sensor hub名稱
                            battery_hub_name.push(hub_name);
                        }
                    }
                }

            }else{ //土壤 ＆ 光照

                for(let sensor_num=0; sensor_num < sensors_info.Items.length; sensor_num++){
                    var sensor = sensors_info.Items[sensor_num];
                    
                    //判斷是要偵測的type就開始算sensor在這個時間區段的斜率
                    if(sensor.sensorType == sensortype.pingtung[type_num]){
                        var one_line_slopes = await methods.httpGet(api_url + 'api/linear/' + period +'/' + sensor.sensorType + '/' + sensor.sensorId + '/' + fromEpoch + '/' + toEpoch, token);
                        //檢查sensor是否有數據
                        if(one_line_slopes != "No data"){
                            methods.add_name_and_type(one_line_slopes, hub_name+" "+sensor.num, sensor.sensorType);
                            multi_line_slopes.push(one_line_slopes);
                        }
                    }
                }

            }

            
        }
        

        //開始偵測異常
        if(sensortype.pingtung[type_num] == "BATTERY_VOLTAGE"){
            methods.check_voltage(voltages_of_each_batteries, "火龍果", battery_hub_name, token);
        }else if(sensortype.pingtung[type_num] == "LIGHT_INTENSITY"){
            methods.check_light(multi_line_slopes, "火龍果", token);
        }else{
            console.log(sensortype.pingtung[type_num]);
            console.log();
            console.log(multi_line_slopes);
            console.log();
            methods.filterOutlier(multi_line_slopes, "火龍果", sensortype.pingtung[type_num], token);
        }
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
        
        console.log("----------------------------------");
        //儲存同一種類sensor的所有斜率資料
        var multi_line_slopes = [];

        //BATTERY_VOLTAGE使用
        voltages_of_each_batteries = [];
        battery_hub_name = [];
        //----------------------------

        //挑出sensorhub中一樣type的sensor，檢查是否異常
        for(let group_num=0; group_num < sensorhub.dapingwo.length; group_num++){
            var hub_name = await methods.httpGet(api_url+"api/sensor_group/name/"+sensorhub.dapingwo[group_num], token);
            console.log("hub_name: "+hub_name);
            var sensors_info = await methods.httpGet(api_url+"api/sensors_in_group/"+sensorhub.dapingwo[group_num], token);
            
            if(sensortype.dapingwo[type_num] == "BATTERY_VOLTAGE"){

                for(let sensor_num=0; sensor_num<sensors_info.Items.length; sensor_num++){
                    var sensor = sensors_info.Items[sensor_num];
                    if(sensor.sensorType == "BATTERY_VOLTAGE"){
                        var voltages = await methods.httpGet(api_url + 'api/sensors_in_timeinterval/' + sensor.sensorType + '/' + sensor.sensorId + '/' + fromEpoch + '/' + toEpoch + '?token=' + token);
                        if(voltages.Count > 0){
                            var one_voltages_set = [];
                            for(let k=0; k<voltages.Items.length; k++){
                                one_voltages_set.push(voltages.Items[k]);
                            }
                            voltages_of_each_batteries.push(one_voltages_set);
                            //當有電壓值時，另外紀錄sensor hub名稱
                            battery_hub_name.push(hub_name);
                        }
                    }
                }

            }else{ //土壤 ＆ 光照

                for(let sensor_num=0; sensor_num < sensors_info.Items.length; sensor_num++){
                    var sensor = sensors_info.Items[sensor_num];
                    
                    //判斷是要偵測的type就開始算sensor在這個時間區段的斜率
                    if(sensor.sensorType == sensortype.dapingwo[type_num]){
                        var one_line_slopes = await methods.httpGet(api_url + 'api/linear/' + period +'/' + sensor.sensorType + '/' + sensor.sensorId + '/' + fromEpoch + '/' + toEpoch, token);
                        //檢查sensor是否有數據
                        if(one_line_slopes != "No data"){
                            methods.add_name_and_type(one_line_slopes, hub_name+" "+sensor.num, sensor.sensorType);
                            multi_line_slopes.push(one_line_slopes);
                        }
                    }
                }

            }

        }

        //開始偵測異常
        
        //開始偵測異常
        if(sensortype.dapingwo[type_num] == "BATTERY_VOLTAGE"){
            methods.check_voltage(voltages_of_each_batteries, "大平窩", battery_hub_name, token);
        }else if(sensortype.dapingwo[type_num] == "LIGHT_INTENSITY"){
            methods.check_light(multi_line_slopes, "大平窩", token);
        }else{
            console.log(sensortype.dapingwo[type_num]);
            console.log();
            console.log(multi_line_slopes);
            console.log();    
            methods.filterOutlier(multi_line_slopes, "大平窩", sensortype.dapingwo[type_num], token);
        }
    }
}