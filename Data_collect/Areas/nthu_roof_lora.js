var methods = require('../methods');

var mqtt = require("mqtt");
var path = require('path');
var yaml = require('js-yaml');
var fs = require('fs');
var rp = require('request-promise');

try {
  var doc = yaml.safeLoad(fs.readFileSync(path.join(__dirname, '../../config') + '/secrets.yml', 'utf8'));
} catch (e) {
  console.log(e);
}

var option = {
  port: doc.MQTT_server1.port,
  clientId: "nthu_roof_lora",
  username: doc.MQTT_server1.HSNL_user,
  password: doc.MQTT_server1.HSNL_password
};

var topic = "#";
var client = mqtt.connect('mqtt://' + doc.MQTT_server1.IP, option);

var start = function() {
  client.on("connect", function() {
    console.log("Subscribing TOPIC: " + topic);
    client.subscribe(topic);
  });

  client.on("message", function(topic, msg) {
    var msg_temp = msg.toString();

    if (msg_temp.startsWith("[{")) {
      var sensor_data = JSON.parse(msg_temp)[0];
      if (sensor_data['macAddr'] == '000000000501085d') {
        data = methods.hex2asc(sensor_data.data)
        data1 = parseFloat(data.slice(1, 6));
        data2 = parseFloat(data.slice(6));
        if (data.startsWith("A")) {
          methods.save_data('AIR_TEMPERATURE', data1, '0a75a280-60c7-11e8-b158-cff2cd389bf6');
          methods.save_data('AIR_HUMIDITY', data2, '1739ea30-60c7-11e8-b158-cff2cd389bf6');
        }
        else if (data.startsWith("S")) {
          methods.save_data('SOIL_TEMPERATURE', data1, '2bb23da0-60c7-11e8-b158-cff2cd389bf6');
          methods.save_data('SOIL_HUMIDITY', data2, '21ffa2c0-60c7-11e8-b158-cff2cd389bf6');
        }
        else if (data.startsWith("L")) {
          light = parseInt(data.slice(2));
          methods.save_data('LIGHT_INTENSITY', light, '36fc4160-60c7-11e8-b158-cff2cd389bf6');
        }
        else if (data.startsWith("B")) {
          battery = parseFloat(data.slice(6));
          methods.save_data('LIGHT_INTENSITY', battery, '5231bd70-60c7-11e8-b158-cff2cd389bf6');
        }
      }
    }
  });
}

module.exports.start = start;
