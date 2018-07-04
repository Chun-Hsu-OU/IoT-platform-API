var request = require('request');
var api_url = 'http://ec2-13-125-205-170.ap-northeast-2.compute.amazonaws.com:3000';


  request.get({
    url: api_url + '/api/control/single/70b3f13b-f2a9-478d-acc0-8815b473c8e2',
    json: true
  }, function(e, r, controller) {
    if (controller.Items.auto == 'OFF') {
      console.log("Nothing to control");
    } else {
      request.get({
        url: api_url + '/api/sensors/AIR_TEMPERATURE/30dd6480-4d53-11e8-b0d8-83454b04a8a4',
        json: true
      }, function(e, r, data) {
        control(controller.Items[0], data.value);
        console.log(data.value);
      });
    }
  });



function control(control_data, data) {
  if (control_data.follow_rule == 'ON_for') {
    var block_array = [];
    for (let i = 0; i < control_data.rules.length; i++) {
      block_array = includes(block_array, control_data.rules[i].block);
    }
    console.log(block_array);

    for (let i = 0; i < block_array.length; i++) {
      1
    }
  } else {
    console.log("No");
  }
}

function includes(array, item) {
  if (array.length > 0) {
    array.forEach(function check(index) {
      if (index == item) {
        return array;
      }
    });
  }
  array.push(item);
  return array;
}
