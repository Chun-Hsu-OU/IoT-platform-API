const YAML = require('yamljs');
const fs = require("fs");
var path = require('path');
var mqtt = require("mqtt");

var methods = require('../methods');

var record_time = 0;//紀錄上一筆時間，才能計算下一筆隔多久
var time_period = 12*60*1000;//間隔多長再收下一筆，ex: 12分鐘

// file为文件所在路径
var doc = YAML.parse(fs.readFileSync(path.join(__dirname, '../../config') + '/secrets.yml').toString());
var meter_addr = YAML.parse(fs.readFileSync(path.join(__dirname, '../../config') + '/pm2_5.yml').toString());

var option = {
    port: doc.MQTT_server1.port,
    clientId: "pm2_5",
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
                    handle(sensor_data.data, sensor_data.macAddr);
                }
            }
        }
    });
}

async function handle(data, macAddr){

    var raw_data = data.slice(12,16);
    // console.log("raw: " + raw_data);
    var pm2_5 = parseInt(raw_data, 16);
    // console.log("pm2.5: " + pm2_5);
    // console.log("------------------------------------");
    
    var id = await methods.searchId(macAddr, "PM2_5", "1");
    methods.save_data("PM2_5", pm2_5, id);
    
}

// start();
module.exports.start = start;