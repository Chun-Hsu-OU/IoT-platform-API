var rp = require('request-promise');

var save_data = function(type, value, id) {
  var options = {
    method: 'POST',
    uri: 'http://ec2-13-125-253-199.ap-northeast-2.compute.amazonaws.com:3000/open/add/value',
    //uri: 'http://localhost:3000/api/add/value',
    body: {
      'sensorType': type,
      'value': parseFloat(value),
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

var hex2asc = function(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

function searchId(macAddr, type, num) {
  var options = {
      method: 'GET',
      uri: 'http://ec2-13-125-253-199.ap-northeast-2.compute.amazonaws.com:3000/open/sensors/single/' +macAddr+ '/'+ type+ '/'+ num,
      //uri: 'http://localhost:3000/api/add/value',

      json: true
  };

  return rp(options)
  .then(function(response) {
      // console.log(response);
      return response;
  })
  .catch(function(err) {
      console.log(err);
  });
}

module.exports.save_data = save_data;
module.exports.hex2asc = hex2asc;
module.exports.searchId = searchId;
