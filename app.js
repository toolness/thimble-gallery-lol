var express = require('express'),
    fs = require('fs'),
    http = require('http'),
    config = require('./config'),
    PublishedPageTracker = require('./published-page-tracker'),
    app = express.createServer(),
    lazyRenders = {};

var ppt = PublishedPageTracker();

if (config.auth)
  app.use(express.basicAuth(function(username, password) {
    return (username == config.auth.username &&
            password == config.auth.password);
  }));

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
app.get('/stats', function(req, res) {
  res.send({
    uniques: Object.keys(ppt.allHashes).length
  });
});
app.get('/unique/:start/:count', function(req, res) {
  var MAX_COUNT = 100;
  var count = parseInt(req.param('count', '0'));
  var start = parseInt(req.param('start', '0'));
  if (isNaN(count) || count <= 0 || count > MAX_COUNT)
    count = MAX_COUNT;
  if (isNaN(start))
    start = 0;
  var end = start + count;
  if (start < 0 && end >= 0)
    end = undefined;
  var chunk = Object.keys(ppt.allHashes).slice(start, end);
  res.send(chunk.map(function(hash) {
    return ppt.allHashes[hash];
  }));
});
app.use(express.static(__dirname + '/static'));
app.listen(3000);
