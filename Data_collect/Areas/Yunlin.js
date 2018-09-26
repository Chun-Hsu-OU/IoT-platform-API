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
  clientId: "Yunlin",
  username: doc.MQTT_server1.HSNL_user,
  password: doc.MQTT_server1.HSNL_password
};

var topic = "GIOT-GW/UL/crc3038";
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

      if (sensor_data['macAddr'] == 'hsnl1') {
        if(sensor_data['Sensortype'] == 'Air'){
          methods.save_data('AIR_TEMPERATURE', sensor_data.Airtemp, '8985ce9f-6074-4d37-b37a-f1e458558852');
          methods.save_data('AIR_HUMIDITY', sensor_data.Airhum, 'd9ebfa78-13de-4522-a82d-3d6b04285d7b');
        }else if(sensor_data['Sensortype'] == 'Soil'){
          methods.save_data('SOIL_TEMPERATURE', sensor_data.Soiltemp, 'a175e55e-d2e0-493f-8fba-00591fc9dccc');
          methods.save_data('SOIL_HUMIDITY', sensor_data.Soilhum, '58c71479-a373-453d-833f-dc8f8e1a0ee7');
        }else if(sensor_data['Sensortype'] == 'Light'){
          methods.save_data('LIGHT_INTENSITY', sensor_data.Lightlux, 'fa175b88-1b7d-46af-a2a7-ea3e9106d156');
        }else if(sensor_data['Sensortype'] == 'Battery'){
          methods.save_data('BATTERY_VOLTAGE', sensor_data.Batteryvoltage, '8a7357d6-ff05-486e-bdc9-426d5db9f1b4');
        } 
      }
    }
  });
}

module.exports.start = start;
