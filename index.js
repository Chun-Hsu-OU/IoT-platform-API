var express = require('express');
const path = require('path');

var bodyParser = require('body-parser');

var port = process.env.PORT || 3000;

var app = express();
var account = require('./APIs/Account');
var search = require('./APIs/Search');
var add = require('./APIs/Add');
var customize = require('./APIs/Customize');
var delete_item = require('./APIs/Delete');

var unlencodedParser = bodyParser.urlencoded({ extended: false });

app.use('/api/', account);
app.use('/api/', search);
app.use('/api/', add);
app.use('/api/', customize);
app.use('/api/', delete_item);

app.listen(port, function() {
    console.log('ON localhost port 3000');
})
