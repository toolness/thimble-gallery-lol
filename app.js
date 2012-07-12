var express = require('express'),
    fs = require('fs'),
    http = require('http'),
    config = require('./config'),
    Favorites = require('./favorites'),
    PublishedPageTracker = require('./published-page-tracker'),
    app = express.createServer(),
    lazyRenders = {},
    ppt = PublishedPageTracker(),
    faves = Favorites(ppt.client, ppt.thimbleHostname);

var STATIC_DIR = __dirname + '/static';

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

function sendIndexHTML(res) {
  fs.readFile(STATIC_DIR + '/index.html', 'utf-8', function(err, html) {
    if (err) return res.send(500);
    res.send(html);
  });
}

app.get('/popular', function(req, res) {
  sendIndexHTML(res);
});

app.get('/recent-favorites', function(req, res) {
  sendIndexHTML(res);
});

app.get('/p/:id', function(req, res) {
  var key = req.param('id', 'nonexistent');
  ppt.pageExists(key, function(exists) {
    if (!exists)
      return res.send(404);
    sendIndexHTML(res);
  });
});

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
app.post('/favorite/:id', function(req, res) {
  faves.favorite(req.param('id'), function(err) {
    if (err) return res.send(500);
    res.send('Thanks!');
  });
});
app.post('/unfavorite/:id', function(req, res) {
  faves.unfavorite(req.param('id'), function(err) {
    if (err) return res.send(500);
    res.send('Thanks!');
  });
});
app.get('/favorites/popular', function(req, res) {
  faves.getMostPopular(function(err, list) {
    if (err) return res.send(500);
    res.send(list);
  });
});
app.get('/favorites/activity', function(req, res) {
  faves.getRecentActivity(function(err, list) {
    if (err) return res.send(500);
    res.send(list);
  });
});
app.get('/favorites/scores', function(req, res) {
  var keys = req.param('keys', null);
  if (!keys)
    return res.send(400);
  faves.scoresForKeys(keys.split(','), function(err, pagesWithScores) {
    if (err)
      return res.send(500);
    res.send(pagesWithScores);
  });
});
app.get('/stats', function(req, res) {
  ppt.getUniquePageCount(function(err, count) {
    if (err)
      return res.send(500);
    res.send({
      uniques: count
    });
  });
});
app.get('/unique/:start/:count', function(req, res) {
  var MAX_COUNT = 100;
  var count = parseInt(req.param('count', '0'));
  var start = parseInt(req.param('start', '0'));
  if (isNaN(count) || count <= 0 || count > MAX_COUNT)
    count = MAX_COUNT;
  if (isNaN(start) || start < 0)
    start = 0;
  var end = start + count - 1;
  ppt.getUniquePageSlice(start, end, function(err, pages) {
    if (err)
      return res.send(500);
    faves.scoresForKeys(pages, function(err, pagesWithScores) {
      if (err)
        return res.send(500);
      res.send(pagesWithScores);
    });
  });
});
app.use(express.static(STATIC_DIR));
app.listen(config.appPort, function() {
  console.log('app listening on port', config.appPort);
});
