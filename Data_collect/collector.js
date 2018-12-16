var nthu_roof = require('./Areas/nthu_roof');
var nthu_roof_lora = require('./Areas/nthu_roof_lora');
var happyfarming = require('./Areas/happyfarming');
var niu = require('./Areas/niu');
var LoRa = require('./Areas/LoRa');
var Yunlin = require('./Areas/Yunlin');
var water_meter = require('./Areas/water_meter');
var electric_meter = require('./Areas/electric_meter');
var pm2_5 = require('./Areas/pm2_5');

nthu_roof.start();
nthu_roof_lora.start();
happyfarming.start();
niu.start();
LoRa.start();
Yunlin.start();
water_meter.start();
electric_meter.start();
pm2_5.start();