const Busboy = require('busboy');
const busboy = require('connect-busboy');
const busboyBodyParser = require('busboy-body-parser');

var express = require('express');
var bodyParser = require('body-parser');
var AWS = require("aws-sdk");
var yaml = require('js-yaml');
var fs = require('fs');
var path = require('path');

//var uuid = require("uuid");

var file_manage = express.Router();

file_manage.use(busboy());
file_manage.use(bodyParser.urlencoded({
  extended: true
}));
file_manage.use(bodyParser.json());
file_manage.use(busboyBodyParser());


try {
  var doc = yaml.safeLoad(fs.readFileSync(path.join(__dirname, '../config') + '/secrets.yml', 'utf8'));
} catch (e) {
  console.log(e);
}

const BUCKET_NAME = doc.S3_config.BUCKET_NAME;
const IAM_USER_KEY = doc.S3_config.IAM_USER_KEY;
const IAM_USER_SECRET = doc.S3_config.IAM_USER_SECRET;

AWS.config.update({
  region: 'ap-northeast-2'
});

let s3bucket = new AWS.S3({
  accessKeyId: IAM_USER_KEY,
  secretAccessKey: IAM_USER_SECRET,
  endpoint: 's3-ap-northeast-2.amazonaws.com',
  Bucket: BUCKET_NAME
});

function uploadToS3(file, element) {
  s3bucket.createBucket(function() {
    var params = {
      Bucket: BUCKET_NAME,
      Key: `${element}/${file.name}`,
      Body: file.data
    };
    s3bucket.upload(params, function(err, data) {
      if (err) {
        console.log('error in callback');
        console.log(err);
      }
      console.log('success');
      console.log(data);
    });
  });
}


file_manage.post('/add/file', function(req, res, next) {
  const element1 = req.body.element1;

  var busboy = new Busboy({
    headers: req.headers
  });

  busboy.on('finish', function() {
    console.log('Upload finished');
    const file = req.files.element2;
    console.log(file);

    // Begins the upload to the AWS S3
    uploadToS3(file, element1);
  });
  req.pipe(busboy);
  res.send("file uploaded successfully");
  res.end;
});

file_manage.get('/download/file/:ownerId/:timestamp/:file', function(req, res, next) {
  s3bucket.createBucket(function() {
    var params = {
      Bucket: BUCKET_NAME,
      Key: req.params.ownerId + '/' + req.params.timestamp + '/' + req.params.file
    };

    res.set('Access-Control-Allow-Origin', '*');
    s3bucket.getObject(params, function(err, data) {
      if (err) {
        console.log('error in callback');
        console.log(err);
      } else {
        console.log('success');
        console.log(data);

        res.setHeader('Content-disposition', 'attachment; filename=' + req.params.file);
        res.setHeader('Content-length', data.ContentLength);
        res.end(data.Body);
      }
    });
  });
});

file_manage.get('/search/file/:ownerId/:timestamp/:file', function(req, res, next) {
  s3bucket.createBucket(function() {
    var params = {
      Bucket: BUCKET_NAME,
      Key: req.params.ownerId + '/' + req.params.timestamp + '/' + req.params.file
    };

    res.set('Access-Control-Allow-Origin', '*');
    s3bucket.getObject(params, function(err, data) {
      if (err) {
        console.log('error in callback');
        console.log(err);
        res.send("No Data");
        res.end();
      } else {
        console.log('success');
        res.send(data.Body.toString('base64'));
        res.end();
      }
    });
  });
});

module.exports = file_manage;
