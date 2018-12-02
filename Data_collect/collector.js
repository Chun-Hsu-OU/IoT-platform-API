var nthu_roof = require('./Areas/nthu_roof');
var nthu_roof_lora = require('./Areas/nthu_roof_lora');
var happyfarming = require('./Areas/happyfarming');
var niu = require('./Areas/niu');
var LoRa = require('./Areas/LoRa');
var Yunlin = require('./Areas/Yunlin');
var water_meter = require('./Areas/water_meter');

nthu_roof.start();
nthu_roof_lora.start();
happyfarming.start();
niu.start();
LoRa.start();
Yunlin.start();
water_meter.start();