var express = require('express'),
    fs = require('fs'),
    http = require('http'),
    config = require('./config'),
    PublishedPageTracker = require('./published-page-tracker'),
    app = express.createServer(),
    lazyRenders = {};

var ppt = PublishedPageTracker();

function lazyRender(key, next) {
  function callAllNexts() {
    var nexts = lazyRenders[key];
    delete lazyRenders[key];
    nexts.forEach(function(next) { next(); });
  }
  if (key in lazyRenders)
    return lazyRenders[key].push(next);
  var renderReq = http.request({
    host: '127.0.0.1',
    port: config.screencapPort,
    path: '/' + config.secret + '/' + key,
    method: 'POST'
  }, function(renderRes) {
    if (renderRes.statusCode == 200) {
      return callAllNexts();
    } else {
      console.log('failed to render', key, renderRes.statusCode);
      return callAllNexts();
    }
  });
  renderReq.on('error', function(e) {
    console.log('failed to render', key, e);
    return callAllNexts();
  });
  renderReq.end();
  lazyRenders[key] = [next];
}

app.use('/images/', function(req, res, next) {
  var match = req.path.match(/\/([A-Za-z0-9]+)\.png/);
  if (match) {
    var key = match[1];
    return fs.exists(config.imageDir + '/' + key + '.png', function(exists) {
      if (exists)
        return next();
      ppt.pageExists(key, function(exists) {
        if (!exists)
          return next();
        return lazyRender(key, next);
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
app.use(express.static(__dirname + '/static'));
app.listen(3000);
