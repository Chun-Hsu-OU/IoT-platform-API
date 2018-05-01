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


client1.on("message", function(topic, msg) {
  var msg_temp = msg.toString();
  console.log(msg_temp);
  var sensor_data = JSON.parse(msg_temp);
  console.log(sensor_data)

  if (sensor_data['macAddr'] == 'nthuhsnl1') {
    save_data('AIR_TEMPERATURE', sensor_data.Airtemp, '30dd6480-4d53-11e8-b0d8-83454b04a8a4');
    save_data('AIR_HUMIDITY', sensor_data.Airhum, '428a3be0-4d53-11e8-b0d8-83454b04a8a4');
  }
  if (sensor_data['macAddr'] == 'nthuhsnl2') {
    save_data('WIND_DIRECTION', sensor_data.Winddir, '65c78900-4d53-11e8-b0d8-83454b04a8a4');
    save_data('AVG_WIND_SPEED', sensor_data.Windspeed, '835dff80-4d53-11e8-b0d8-83454b04a8a4');
  }
  if (sensor_data['macAddr'] == 'nthuhsnl3') {
    save_data('SOIL_TEMPERATURE', sensor_data.Soiltemp, '59be7b00-4d53-11e8-b0d8-83454b04a8a4');
    save_data('SOIL_HUMIDITY', sensor_data.Soilhum, '50c34940-4d53-11e8-b0d8-83454b04a8a4');
  }
  if (sensor_data['macAddr'] == 'nthuhsnl4') {
    save_data('LIGHT_INTENSITY', sensor_data.Lightlux, '8d741720-4d53-11e8-b0d8-83454b04a8a4');
  }
  if (sensor_data['macAddr'] == 'nthuhsnl5') {
    save_data('BATTERY_VOLTAGE', sensor_data.Batteryvoltage, '98c3c030-4d53-11e8-b0d8-83454b04a8a4');
  }
});


client2.on("message", function(topic, msg) {
  var msg_temp = msg.toString();
  var sensor_data = JSON.parse(msg_temp)[0];
  //console.log(sensor_data);
  //console.log(typeof(sensor_data));
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
    uri: 'http://ec2-13-125-205-170.ap-northeast-2.compute.amazonaws.com:3000/api/add/value',
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
