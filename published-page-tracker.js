var rebase = require('./rebase'),
    https = require('https'),
    redis = require('redis'),
    url = require('url'),
    config = require('./config'),
    client = redis.createClient(config.redis.port, config.redis.host);

var HASH_DIR = config.hashDir + "/",
    THIMBLE_URL = url.parse(config.baseThimbleURL),
    REDIS_PREFIX = THIMBLE_URL.hostname + ':';

client.on('error', function(err) {
  console.log("REDIS ERROR", err);
});

function hashExists(key, cb) {
  client.exists(REDIS_PREFIX + key + ".hash", function(err, exists) {
    if (err) {
      console.log("existence check for key", key, "failed with", err);
      console.log("retrying in 1s");
      setTimeout(function() { hashExists(key, cb); }, 1000);
    } else
      cb(!!exists);
  });
}

function readHash(key, cb) {
  client.get(REDIS_PREFIX + key + ".hash", cb);
}

function writeHash(key, hash, cb) {
  client.set(REDIS_PREFIX + key + ".hash", hash, cb);
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
          getNextBatch(i);
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
PublishedPageTracker.writeHash = writeHash;
PublishedPageTracker.client = client;

if (!module.parent)
  PublishedPageTracker({verbose: true});
