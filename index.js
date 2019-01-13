var express = require('express');
const path = require('path');
const busboy = require('connect-busboy');
const busboyBodyParser = require('busboy-body-parser');

var bodyParser = require('body-parser');

var port = process.env.PORT || 3000;

var app = express();
var account = require('./APIs/sensor-data/Account');
var search = require('./APIs/sensor-data/Search');
var add = require('./APIs/sensor-data/Add');
var customize = require('./APIs/sensor-data/Customize');
var delete_item = require('./APIs/sensor-data/Delete');
var update = require('./APIs/sensor-data/Update');
var control = require('./APIs/Control');
var agri_log = require('./APIs/Agri_log');
var file_manage = require('./APIs/S3_file_manage');
var open = require('./APIs/open');

//var unlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(busboy());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(busboyBodyParser());

app.use('/api/', account);
app.use('/api/', search);
app.use('/api/', add);
app.use('/api/', customize);
app.use('/api/', delete_item);
app.use('/api/', update);
app.use('/api/', control);
app.use('/api/', agri_log);
app.use('/api/', file_manage);
app.use('/open/', open);


app.listen(port, function() {
    console.log('ON localhost port 3000');
})
