const YAML = require('yamljs');
const fs = require("fs");
var path = require('path');
var mqtt = require("mqtt");

var methods = require('../methods');

// file为文件所在路径
var doc = YAML.parse(fs.readFileSync(path.join(__dirname, '../../config') + '/secrets.yml').toString());

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
        console.log("Subscribing TOPIC: " + topic);
        client.subscribe(topic);
    });

    client.on("message", function(topic, msg) {
        var msg_temp = msg.toString();

        if (msg_temp.startsWith("[{")) {
            var sensor_data = JSON.parse(msg_temp)[0];
            if(sensor_data.macAddr == "00000000fe0528ce"){
                handle(sensor_data.data, sensor_data.macAddr);
            }
        }
    });
}

async function handle(data, macAddr){
    var points = parseInt(data.slice(12));
    points = points - 3;
    var divisor = 1;
    for(let i=0;i<points;i++){
        divisor = divisor * 10;
    }
    var meter_data = parseInt(data.slice(2,12));
    meter_data = meter_data / divisor;
    var id = await methods.searchId(macAddr, "METER", "1");
    methods.save_data("METER", meter_data, id);
}

module.exports.start = start;