var express = require('express'),
    fs = require('fs'),
    http = require('http'),
    config = require('./config'),
    PublishedPageTracker = require('./published-page-tracker'),
    app = express.createServer();

var ppt = PublishedPageTracker();

app.use('/images/', function(req, res, next) {
  var match = req.path.match(/\/([A-Za-z0-9]+)\.jpg/);
  if (match) {
    var key = match[1];
    return fs.exists(config.imageDir + '/' + key + '.jpg', function(exists) {
      if (exists)
        return next();
      ppt.pageExists(key, function(exists) {
        if (!exists)
          return next();
        var renderReq = http.request({
          host: '127.0.0.1',
          port: config.screencapPort,
          path: '/' + key,
          method: 'POST'
        }, function(renderRes) {
          if (renderRes.statusCode == 200) {
            return next();
          } else {
            console.log('failed to render', key, renderRes.statusCode);
            return next();
          }
        });
        renderReq.on('error', function(e) {
          console.log('failed to render', key, e);
          return next();
        });
        renderReq.end();
      });
    });
  }
  return next();
});
app.use('/images', express.static(config.imageDir));
app.get('/unique/length', function(req, res) {
  res.send(Object.keys(ppt.allHashes).length.toString());
});
app.get('/unique/slice', function(req, res) {
  var SLICE_SIZE = 50;
  var start = parseInt(req.param('start', '0'));
  var end = start + SLICE_SIZE;
  if (isNaN(start))
    start = 0;
  if (start < 0 && end >= 0)
    end = undefined;
  var chunk = Object.keys(ppt.allHashes).slice(start, end);
  res.send(chunk.map(function(hash) {
    return ppt.allHashes[hash];
  }));
});
app.listen(3000);
