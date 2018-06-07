var express = require('express');
const path = require('path');
const busboy = require('connect-busboy');
const busboyBodyParser = require('busboy-body-parser');

var bodyParser = require('body-parser');

var port = process.env.PORT || 3000;

var app = express();
var account = require('./APIs/Account');
var search = require('./APIs/Search');
var add = require('./APIs/Add');
var customize = require('./APIs/Customize');
var delete_item = require('./APIs/Delete');
var agri_log = require('./APIs/Agri_log');
var file_manage = require('./APIs/S3_file_manage');
var expert_system = require('./APIs/expert_system');

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
app.use('/api/', agri_log);
app.use('/api/', file_manage);
app.use('/api/', expert_system);

app.listen(port, function() {
    console.log('ON localhost port 3000');
})
