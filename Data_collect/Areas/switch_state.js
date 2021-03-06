const YAML = require('yamljs');
const fs = require("fs");
var path = require('path');
var mqtt = require("mqtt");

var methods = require('../methods');

// file为文件所在路径
var doc = YAML.parse(fs.readFileSync(path.join(__dirname, '../../config') + '/secrets.yml').toString());
var switch_addr = YAML.parse(fs.readFileSync(path.join(__dirname, '../../config') + '/switch_state.yml').toString());

var option = {
    port: doc.MQTT_server1.port,
    clientId: "switch",
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
            for(let i=0; i < switch_addr.macAddr.length; i++){
                if(sensor_data.macAddr == switch_addr.macAddr[i]){
                    handle(sensor_data.data, sensor_data.macAddr);
                }
            }
        }
    });
}

async function handle(data, macAddr){
    var raw_data = data.slice(0,2);
    var state = parseInt(raw_data);
    
    var id = await methods.searchId(macAddr, "SWITCH", "1");
    methods.save_data("SWITCH", state, id);
    
}

// start();
module.exports.start = start;