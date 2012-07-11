var rebase = require('./rebase'),
    https = require('https'),
    fs = require('fs'),
    url = require('url'),
    config = require('./config');

var HASH_DIR = config.hashDir + "/",
    THIMBLE_URL = url.parse(config.baseThimbleURL);

function hashExists(key, cb) {
  fs.exists(HASH_DIR + key, cb);
}

function readHash(key, cb) {
  fs.readFile(HASH_DIR + key, 'utf-8', cb);
}

function writeHash(key, hash, cb) {
  fs.writeFile(HASH_DIR + key, hash, 'utf-8', cb);
}

function findHash(id, cb) {
  var key = rebase(id);
  hashExists(key, function(exists) {
    if (exists)
      return readHash(key, function(err, hash) {
        cb(err, id, key, hash);
      });
    var req = https.request({
      host: THIMBLE_URL.hostname,
      port: 443,
      path: THIMBLE_URL.pathname + key,
      method: 'HEAD'
    }, function(res) {
      if (res.statusCode == 200) {
        writeHash(key, res.headers.etag, function(err) {
          cb(err, id, key, res.headers.etag);
        });
      } else
        cb("http error " + res.statusCode, id, key, null);
    });
    req.end();
  });
};

function findManyHashes(start, count, cb) {
  var numLeft = count;
  var errors = [];
  var hashes = {};

  function done(err, id, key, hash) {
    numLeft--;
    if (err)
      errors.push({
        id: id,
        err: err
      });
    else
      hashes[key] = hash;

    if (numLeft == 0)
      cb(errors, hashes);
  }
  
  for (var i = start; i < start+count; i++)
    findHash(i, done);
}

function PublishedPageTracker(options) {
  options = options || {};
  
  var start = options.startIndex || 1,
      batchSize = options.batchSize || 10,
      retryDelay = options.retryDelay || 30000,
      allHashes = {},
      uniqueHashes = 0;
  
  function getNextBatch(i) {
    findManyHashes(i, batchSize, function(errors, hashes) {
      Object.keys(hashes).forEach(function(key) {
        var hash = hashes[key];
        if (!(hash in allHashes)) {
          allHashes[hash] = key;
          uniqueHashes++;
        }
      });
      if (options.verbose)
        console.log("got hashes for " + i + " thru " + (i+batchSize) +
                    "; " + uniqueHashes + " uniques, " + errors.length + 
                    " errors.");
      if (errors.length) {
        if (options.verbose)
          console.log("retrying in " + retryDelay + " ms.");
        setTimeout(function() {
          getNextBatch(errors[0].id);
        }, retryDelay);
      } else
        getNextBatch(i+batchSize);
    });
  }
  
  getNextBatch(start);

  return {
    pageExists: hashExists,
    allHashes: allHashes
  };
}

module.exports = PublishedPageTracker;

if (!module.parent)
  PublishedPageTracker({verbose: true});
