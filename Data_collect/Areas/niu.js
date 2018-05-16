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
  clientId: "nilanu",
  username: doc.MQTT_server1.HSNL_user,
  password: doc.MQTT_server1.HSNL_password
};

var topic = '#';
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
      var data = sensor_data['data'];
      if (sensor_data['macAddr'] == '00000000050102dd') {
        methods.save_data('AIR_TEMPERATURE', data.slice(6, 8) + '.' + data.slice(8, 9), '4d233b80-578d-11e8-9c13-1f431c1a0732');
        methods.save_data('AIR_HUMIDITY', data.slice(9, 11) + '.' + data.slice(11, 12), '7079b5f0-578d-11e8-9c13-1f431c1a0732');
        methods.save_data('SOIL_TEMPERATURE', data.slice(20, 22) + '.' + data.slice(22, 23), '85ddf000-578d-11e8-9c13-1f431c1a0732');
        methods.save_data('SOIL_HUMIDITY', data.slice(23, 25) + '.' + data.slice(25, 26), '7ac20120-578d-11e8-9c13-1f431c1a0732');
        methods.save_data('SOIL_EC', data.slice(26, 27) + '.' + data.slice(27, 31), '91e9e430-578d-11e8-9c13-1f431c1a0732');
        methods.save_data('LIGHT_INTENSITY', data.slice(16, 20), 'a8efc050-578d-11e8-9c13-1f431c1a0732');
        methods.save_data('WIND_DIRECTION', data.slice(33, 35), 'c8081be0-578d-11e8-9c13-1f431c1a0732');
        methods.save_data('AVG_WIND_SPEED', data.slice(31, 33), 'bf69fe40-578d-11e8-9c13-1f431c1a0732');
      }
      else if (sensor_data['macAddr'] == '00000000050101b9') {
        methods.save_data('AIR_TEMPERATURE', data.slice(6, 8) + '.' + data.slice(8, 9), '2bcedd30-578e-11e8-9c13-1f431c1a0732');
        methods.save_data('AIR_HUMIDITY', data.slice(9, 11) + '.' + data.slice(11, 12), '247107c0-578e-11e8-9c13-1f431c1a0732');
        methods.save_data('SOIL_TEMPERATURE', data.slice(20, 22) + '.' + data.slice(22, 23), '109f2d80-578e-11e8-9c13-1f431c1a0732');
        methods.save_data('SOIL_HUMIDITY', data.slice(23, 25) + '.' + data.slice(25, 26), '1acd6100-578e-11e8-9c13-1f431c1a0732');
        methods.save_data('SOIL_EC', data.slice(26, 27) + '.' + data.slice(27, 31), '07264040-578e-11e8-9c13-1f431c1a0732');
        methods.save_data('LIGHT_INTENSITY', data.slice(16, 20), 'f735bee0-578d-11e8-9c13-1f431c1a0732');
        methods.save_data('WIND_DIRECTION', data.slice(33, 35), 'd8db0e00-578d-11e8-9c13-1f431c1a0732');
        methods.save_data('AVG_WIND_SPEED', data.slice(31, 33), 'e7852cb0-578d-11e8-9c13-1f431c1a0732');
      }
      else if (sensor_data['macAddr'] == '00000000050102db') {
        methods.save_data('AIR_TEMPERATURE', data.slice(6, 8) + '.' + data.slice(8, 9), '665386d0-578f-11e8-9c13-1f431c1a0732');
        methods.save_data('AIR_HUMIDITY', data.slice(9, 11) + '.' + data.slice(11, 12), '78561f50-578f-11e8-9c13-1f431c1a0732');
        methods.save_data('SOIL_TEMPERATURE', data.slice(20, 22) + '.' + data.slice(22, 23), '8fcd81f0-578f-11e8-9c13-1f431c1a0732');
        methods.save_data('SOIL_HUMIDITY', data.slice(23, 25) + '.' + data.slice(25, 26), '868604f0-578f-11e8-9c13-1f431c1a0732');
        methods.save_data('SOIL_EC', data.slice(26, 27) + '.' + data.slice(27, 31), '9e9b2e30-578f-11e8-9c13-1f431c1a0732');
        methods.save_data('LIGHT_INTENSITY', data.slice(16, 20), 'ac440980-578f-11e8-9c13-1f431c1a0732');
        methods.save_data('WIND_DIRECTION', data.slice(33, 35), 'b6f17f20-578f-11e8-9c13-1f431c1a0732');
        methods.save_data('AVG_WIND_SPEED', data.slice(31, 33), 'c433a960-578f-11e8-9c13-1f431c1a0732');
      }
    }
  });
}

module.exports.start = start;
