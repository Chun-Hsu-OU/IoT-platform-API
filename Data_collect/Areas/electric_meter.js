const YAML = require('yamljs');
const fs = require("fs");
var path = require('path');
var mqtt = require("mqtt");

var methods = require('../methods');

var record_time = 0;//紀錄上一筆時間，才能計算下一筆隔多久
var time_period = 12*60*1000;//間隔多長再收下一筆，ex: 6分鐘

// file为文件所在路径
var doc = YAML.parse(fs.readFileSync(path.join(__dirname, '../../config') + '/secrets.yml').toString());
var meter_addr = YAML.parse(fs.readFileSync(path.join(__dirname, '../../config') + '/electric_meter.yml').toString());

var option = {
    port: doc.MQTT_server1.port,
    clientId: "electric",
    username: doc.MQTT_server1.HSNL_user,
    password: doc.MQTT_server1.HSNL_password
};

var topic = "#";
var client = mqtt.connect('mqtt://' + doc.MQTT_server1.IP, option);

var start = function() {
    //mqtt
    client.on("connect", function() {
        // console.log("Subscribing TOPIC: " + topic);
        client.subscribe(topic);
    });

    client.on("message", function(topic, msg) {
        var msg_temp = msg.toString();

        if (msg_temp.startsWith("[{")) {
            var sensor_data = JSON.parse(msg_temp)[0];
            for(let i=0; i < meter_addr.macAddr.length; i++){
                if(sensor_data.macAddr == meter_addr.macAddr[i]){
                    console.log(sensor_data);
                    handle(sensor_data.data, sensor_data.macAddr, sensor_data.time);
                }
            }
        }
    });
}

async function handle(data, macAddr, time){

    var converted_time = new Date(time).getTime();
    // console.log("現在時間： "+converted_time);
    // console.log("紀錄時間： "+record_time);

    if((converted_time - record_time) >= time_period){
        record_time = converted_time;

        // var type = data.slice(8,10);
        // console.log("type: "+type);
        var raw_data = data.slice(10);
        // console.log("原始資料: "+raw_data);
        var meter_data = parseInt(raw_data, 16);
        // console.log("處理過後資料: "+meter_data);
        
        var id = await methods.searchId(macAddr, "ELECTRIC_METER", "1");
        methods.save_data("ELECTRIC_METER", meter_data, id);
    }
    
}

// start();
module.exports.start = start;