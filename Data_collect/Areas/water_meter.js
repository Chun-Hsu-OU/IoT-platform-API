const YAML = require('yamljs');
const fs = require("fs");
var path = require('path');
var mqtt = require("mqtt");

var methods = require('../methods');

// file为文件所在路径
var doc = YAML.parse(fs.readFileSync(path.join(__dirname, '../../config') + '/secrets.yml').toString());
var meter_addr = YAML.parse(fs.readFileSync(path.join(__dirname, '../../config') + '/meter_addr.yml').toString());

var option = {
    port: doc.MQTT_server1.port,
    clientId: "meter",
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
                    // console.log(sensor_data);
                    handle(sensor_data.data, sensor_data.macAddr);
                }
            }
        }
    });
}

async function handle(data, macAddr){
    var points = parseInt(data.slice(12));
    var divisor = 1;
    for(let i=0;i<points;i++){
        divisor = divisor * 10;
    }
    var meter_data = parseInt(data.slice(2,12));
    meter_data = meter_data / divisor;
    var id = await methods.searchId(macAddr, "METER", "1");
    methods.save_data("METER", meter_data, id);
    // console.log(data);
    // console.log("macAddr: "+macAddr);
    // console.log("data: "+meter_data);
}

// start();
module.exports.start = start;