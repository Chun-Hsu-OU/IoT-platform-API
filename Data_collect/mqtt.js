var mqtt = require("mqtt");
var yaml = require('js-yaml');
var fs = require('fs');
var rp = require('request-promise');

try {
  var doc = yaml.safeLoad(fs.readFileSync('../config/secrets.yml', 'utf8'));
  //console.log(doc.MQTT_server1.HSNL_user);
} catch (e) {
  console.log(e);
}

var option1 = {
  port: doc.MQTT_server1.port,
  clientId: doc.MQTT_server1.HSNL_clientID,
  username: doc.MQTT_server1.HSNL_user,
  password: doc.MQTT_server1.HSNL_password
};

var option2 = {
  port: doc.MQTT_server2.port,
  clientId: doc.MQTT_server2.HSNL_clientID,
  username: doc.MQTT_server2.HSNL_user,
  password: doc.MQTT_server2.HSNL_password
};

var topic1 = doc.MQTT_server1.topic;
var topic2 = doc.MQTT_server2.topic;

var client1 = mqtt.connect('mqtt://' + doc.MQTT_server1.IP, option1);
var client2 = mqtt.connect('mqtt://' + doc.MQTT_server2.IP, option2);

client1.on("connect", function() {
  console.log("Subscribing TOPIC: " + topic1);
  client1.subscribe(topic1);
});

client2.on("connect", function() {
  console.log("Subscribing TOPIC: " + topic2);
  client2.subscribe(topic2);
});

/*
client1.on("message", function(topic, msg) {
  var message = msg.toJSON();

  if (message.macAddr == 'nthuhsnl1') {
    save_data('AIR_TEMPERATURE', message.Airtemp, );
    save_data('AIR_HUMIDITY', message.Airhum, );
  }
  if (message.macAddr == 'nthuhsnl2') {
    save_data('WIND_DIRECTION', message.Winddir, );
    save_data('AVG_WIND_SPEED', message.Windspeed, );
  }
  if (message.macAddr == 'nthuhsnl3') {
    save_data('SOIL_TEMPERATURE', message.Soiltemp, );
    save_data('SOIL_HUMIDITY', message.Soilhum, );
  }
  if (message.macAddr == 'nthuhsnl4') {
    save_data('LIGHT_INTENSITY', message.Lightlux, );
  }
  if (message.macAddr == 'nthuhsnl5') {
    save_data('BATTERY_VOLTAGE', message.Batteryvoltage, );
  }
  //console.log(" 收到 " + topic + " 主題，訊息：" + message);
});
*/

client2.on("message", function(topic, msg) {
  var msg_temp = msg.toString();
  var sensor_data = JSON.parse(msg_temp)[0];
  console.log(sensor_data);
  console.log(typeof(sensor_data));
  if (sensor_data['macAddr'] == '000000000501086d') {
    data = hex2asc(sensor_data.data)
    data1 = parseFloat(data.slice(1, 6));
    data2 = parseFloat(data.slice(6));
    if (data.startsWith("A")) {
      save_data('AIR_TEMPERATURE', data1, 'c3d80a00-4d09-11e8-bfa3-11e6060cdf65');
      save_data('AIR_HUMIDITY', data2, 'f0af39e0-4d09-11e8-bfa3-11e6060cdf65');
    }
    else if (data.startsWith("S")) {
      save_data('SOIL_TEMPERATURE', data1, '087cd2d0-4d0a-11e8-bfa3-11e6060cdf65');
      save_data('SOIL_HUMIDITY', data2, 'fd6291a0-4d09-11e8-bfa3-11e6060cdf65');
    }
    //console.log("data = " + data);
  }
  console.log(" 收到 " + topic + " 主題，訊息：" + msg.toString());
  //console.log(sensor_data['macAddr']);
});

function save_data(type, value, id) {
  var options = {
    method: 'POST',
    uri: 'http://localhost:3000/api/add/value',
    body: {
      'sensorType': type,
      'value': value,
      'sensorId': id
    },
    json: true
  };

  rp(options)
    .then(function(response) {
      console.log(response);
    })
    .catch(function(err) {
      console.log(err);
    });
}

function hex2asc(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}
