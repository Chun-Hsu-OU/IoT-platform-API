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
  clientId: doc.MQTT_server1.HSNL_clientID,
  username: doc.MQTT_server1.HSNL_user,
  password: doc.MQTT_server1.HSNL_password
};

var topic = doc.MQTT_server1.topic;
var client = mqtt.connect('mqtt://' + doc.MQTT_server1.IP, option);

var start = function() {
  client.on("connect", function() {
    console.log("Subscribing TOPIC: " + topic);
    client.subscribe(topic);
  });

  client.on("message", function(topic, msg) {
    var msg_temp = msg.toString();

    if (msg_temp.startsWith("{")) {
      var sensor_data = JSON.parse(msg_temp);

      if (sensor_data['macAddr'] == 'nthuhsnl1') {
        methods.save_data('AIR_TEMPERATURE', sensor_data.Airtemp, '30dd6480-4d53-11e8-b0d8-83454b04a8a4');
        methods.save_data('AIR_HUMIDITY', sensor_data.Airhum, '428a3be0-4d53-11e8-b0d8-83454b04a8a4');
      }
      if (sensor_data['macAddr'] == 'nthuhsnl2') {
        methods.save_data('WIND_DIRECTION', sensor_data.Winddir, '65c78900-4d53-11e8-b0d8-83454b04a8a4');
        methods.save_data('AVG_WIND_SPEED', sensor_data.Windspeed, '835dff80-4d53-11e8-b0d8-83454b04a8a4');
      }
      if (sensor_data['macAddr'] == 'nthuhsnl3') {
        methods.save_data('SOIL_TEMPERATURE', sensor_data.Soiltemp, '59be7b00-4d53-11e8-b0d8-83454b04a8a4');
        methods.save_data('SOIL_HUMIDITY', sensor_data.Soilhum, '50c34940-4d53-11e8-b0d8-83454b04a8a4');
      }
      if (sensor_data['macAddr'] == 'nthuhsnl4') {
        methods.save_data('LIGHT_INTENSITY', sensor_data.Lightlux, '8d741720-4d53-11e8-b0d8-83454b04a8a4');
      }
      if (sensor_data['macAddr'] == 'nthuhsnl5') {
        methods.save_data('BATTERY_VOLTAGE', sensor_data.Batteryvoltage, '98c3c030-4d53-11e8-b0d8-83454b04a8a4');
      }
    }
  });
}

module.exports.start = start;
