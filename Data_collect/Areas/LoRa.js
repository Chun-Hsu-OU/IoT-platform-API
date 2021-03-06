const YAML = require('yamljs');
const fs = require("fs");
var path = require('path');
var mqtt = require("mqtt");

var methods = require('../methods');

// file为文件所在路径
var json = YAML.parse(fs.readFileSync(path.join(__dirname, '../../config') + '/json.yml').toString());
var doc = YAML.parse(fs.readFileSync(path.join(__dirname, '../../config') + '/secrets.yml').toString());

var option = {
    port: doc.MQTT_server1.port,
    clientId: "Lab_test",
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
        for(let i=0; i < json.macAddr.length; i++){
            if(sensor_data.macAddr == json.macAddr[i]){
                handle(sensor_data.data, sensor_data.macAddr);
            }
        }
        }
    });
}

async function handle(data, macAddr){
    var str = methods.hex2asc(data);
    var type = str.slice(0,1);
    var num = str.slice(1,2);

    if(type == "A"){
        var tem_data = parseFloat(str.slice(5,8)) / 10;
        var hum_data = parseFloat(str.slice(8)) / 10;
        console.log("type:" + type);
        console.log("num:" + num);
        console.log("tem_data:" + tem_data);
        console.log("hum_data:" + hum_data);
        if(tem_data>=0 && tem_data<=100){
            var tem_id = await methods.searchId(macAddr, json.sensorTypes.a_tem, num);
            console.log("air temp id: " + tem_id);
            methods.save_data(json.sensorTypes.a_tem, tem_data, tem_id);
        }
        if(hum_data>=0 && hum_data<=100){
            var hum_id = await methods.searchId(macAddr, json.sensorTypes.a_hum, num);
            console.log("air humi id: " + hum_id);
            methods.save_data(json.sensorTypes.a_hum, hum_data, hum_id);
        }    
    }else if(type == "F"){
        var tem_data = parseFloat(str.slice(2,6)) / 100;
        var hum_data = parseFloat(str.slice(6)) / 100;
        console.log("type:" + type);
        console.log("num:" + num);
        console.log("tem_data:" + tem_data);
        console.log("hum_data:" + hum_data);
        var tem_id = await methods.searchId(macAddr, json.sensorTypes.s_tem, num);
        var hum_id = await methods.searchId(macAddr, json.sensorTypes.s_hum, num);
        console.log("soil temp id: " + tem_id);
        console.log("soil humi id: " + hum_id);
        console.log("--------------------------------");
        methods.save_data(json.sensorTypes.s_tem, tem_data ,tem_id);
        methods.save_data(json.sensorTypes.s_hum, hum_data ,hum_id);
    }else if(type == "S"){
        var tem_data = parseFloat(str.slice(3,7)) / 100;
        var hum_data = parseFloat(str.slice(7)) / 100;
        console.log("type:" + type);
        console.log("num:" + num);
        console.log("tem_data:" + tem_data);
        console.log("hum_data:" + hum_data);
        if(tem_data>=0 && tem_data<=100){
            var tem_id = await methods.searchId(macAddr, json.sensorTypes.s_tem, num);
            console.log("soil temp id: " + tem_id);
            methods.save_data(json.sensorTypes.s_tem, tem_data ,tem_id);
        }
        if(hum_data>=0 && hum_data<=100){
            var hum_id = await methods.searchId(macAddr, json.sensorTypes.s_hum, num);
            console.log("soil humi id: " + hum_id);
            methods.save_data(json.sensorTypes.s_hum, hum_data ,hum_id);
        }
    }else if(type == "B"){
        var voltage_data = parseFloat(str.slice(6));
        console.log("type:" + type);
        console.log("num:" + num);
        console.log("voltage_data:" + voltage_data);
        if(voltage_data>=7 && voltage_data<=13){
            var id = await methods.searchId(macAddr, json.sensorTypes.batv, num);
            console.log("battery id: " + id);
            console.log("--------------------------------");
            methods.save_data(json.sensorTypes.batv, voltage_data ,id);
        }
    }else if(type == "L"){
        var digit = parseFloat(str.slice(2,3));
        var value = str.slice(11 - digit);
        console.log("type:" + type);
        console.log("num:" + num);
        console.log("digit:" + digit);
        console.log("value:" + value);
        var id = await methods.searchId(macAddr, json.sensorTypes.light, num);
        console.log("Light id: " + id);
        console.log("--------------------------------");
        methods.save_data(json.sensorTypes.light, value, id);
    }else if(type == "E"){
        var digit = parseFloat(str.slice(2,3));
        var value = str.slice(11 - digit);
        console.log("type:" + type);
        console.log("num:" + num);
        console.log("digit:" + digit);
        console.log("value:" + value);
        var id = await methods.searchId(macAddr, json.sensorTypes.s_ec, num);
        console.log("Soil_EC id: " + id);
        console.log("--------------------------------");
        methods.save_data(json.sensorTypes.s_ec, value ,id);
    }else if(type == "W"){
        if(num == "1"){ //風向
            var value = str.slice(10);
            var id = await methods.searchId(macAddr, json.sensorTypes.wd, "1");
            methods.save_data(json.sensorTypes.wd, value ,id);
        }else if(num == "2"){   //風速
            var digit = parseFloat(str.slice(2,3));
            var value = parseFloat(str.slice(11 - digit)) / 10;
            if(value>=0 && value<=10){
                var id = await methods.searchId(macAddr, json.sensorTypes.real_ws, "1");
                methods.save_data(json.sensorTypes.real_ws, value ,id);
            }
        }
    }else if(type == "C"){
        var digit = parseFloat(str.slice(2,3));
        var value = str.slice(11 - digit);
        console.log("type:" + type);
        console.log("num:" + num);
        console.log("digit:" + digit);
        console.log("value:" + value);
        var id = await methods.searchId(macAddr, json.sensorTypes.co2, num);
        console.log("CO2 id: " + id);
        console.log("--------------------------------");
        methods.save_data(json.sensorTypes.co2, value ,id);
    }else{
        console.log("err:"+str);
    }
}

module.exports.start = start;