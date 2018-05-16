var methods = require('../methods');

var mqtt = require("mqtt");
var yaml = require('js-yaml');
var fs = require('fs');
var rp = require('request-promise');

try {
  var doc = yaml.safeLoad(fs.readFileSync('../config/secrets.yml', 'utf8'));
} catch (e) {
  console.log(e);
}

var option = {
  port: doc.MQTT_server2.port,
  clientId: doc.MQTT_server2.HSNL_clientID,
  username: doc.MQTT_server2.HSNL_user,
  password: doc.MQTT_server2.HSNL_password
};

var topic = doc.MQTT_server2.topic;
var client = mqtt.connect('mqtt://' + doc.MQTT_server2.IP, option);

var start = function() {
  client.on("connect", function() {
    console.log("Subscribing TOPIC: " + topic);
    client.subscribe(topic);
  });

  client.on("message", function(topic, msg) {
    var msg_temp = msg.toString();

    if (msg_temp.startsWith("[{")) {
      var sensor_data = JSON.parse(msg_temp)[0];
      if (sensor_data['macAddr'] == '000000000501086d') {
        data = methods.hex2asc(sensor_data.data)
        data1 = parseFloat(data.slice(1, 6));
        data2 = parseFloat(data.slice(6));
        if (data.startsWith("A")) {
          methods.save_data('AIR_TEMPERATURE', data1, 'c3d80a00-4d09-11e8-bfa3-11e6060cdf65');
          methods.save_data('AIR_HUMIDITY', data2, 'f0af39e0-4d09-11e8-bfa3-11e6060cdf65');
        }
        else if (data.startsWith("S")) {
          methods.save_data('SOIL_TEMPERATURE', data1, '087cd2d0-4d0a-11e8-bfa3-11e6060cdf65');
          methods.save_data('SOIL_HUMIDITY', data2, 'fd6291a0-4d09-11e8-bfa3-11e6060cdf65');
        }
      }
    }
  });
}

module.exports.start = start;
