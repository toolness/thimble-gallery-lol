var rebase = require('./rebase'),
    https = require('https'),
    redis = require('redis'),
    url = require('url'),
    globalConfig = require('./config');

function makeRedisClient(config) {
  var client = redis.createClient(config.port, config.host);
  client.on('error', function(err) {
    console.log("REDIS ERROR", err);
  });
  return client;
}

function HashFinder(options) {
  options = options || {};

  var idToKey = options.idToKey || rebase,
      baseThimbleURL = options.baseThimbleURL || globalConfig.baseThimbleURL,
      client = options.client || makeRedisClient(globalConfig.redis);

  var THIMBLE_URL = url.parse(baseThimbleURL),
      REDIS_PREFIX = THIMBLE_URL.hostname + ':';

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
    var key = idToKey(id);
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
  
  return {
    findManyHashes: findManyHashes,
    hashExists: hashExists,
    readHash: readHash,
    writeHash: writeHash,
    thimbleHostname: THIMBLE_URL.hostname,
    idToKey: idToKey,
    client: client,
    flushAllHashes: function(cb) {
      client.keys(REDIS_PREFIX + "*", function(err, keys) {
        if (err)
          return cb(err);
        if (keys.length)
          client.del(keys, cb);
        else
          cb(null);
      });
    }
  };
}

function UniquePageTracker(options) {
  var hashFinder = options.hashFinder,
      client = hashFinder.client,
      REDIS_PREFIX = 'unique:' + hashFinder.thimbleHostname + ':',
      LASTID_KEY = REDIS_PREFIX + 'lastId',
      SORTEDSET_KEY = REDIS_PREFIX + 'set',
      self = {};

  function updateNextId(cb) {
    client.get(LASTID_KEY, function(err, lastId) {
      if (err)
        return cb(err);
      lastId = parseInt(lastId || '0');
      var nextId = lastId + 1;
      var nextKey = hashFinder.idToKey(nextId);
      hashFinder.readHash(nextKey, function(err, hash) {
        if (err)
          return cb(err);
        if (!hash)
          // The hash doesn't exist yet, so we're done.
          return cb(null, false, lastId);
        client.zrank(SORTEDSET_KEY, hash, function(err, index) {
          if (err)
            return cb(err);
          if (index === null) {
            client.zadd(SORTEDSET_KEY, nextId, hash, function(err) {
              if (err)
                return cb(err);
              client.incr(LASTID_KEY, function(err) {
                if (err)
                  return cb(err);
                cb(null, true, nextId);
              });
            });
          } else {
            // A page with this exact content has already been published.
            client.incr(LASTID_KEY, function(err) {
              if (err)
                return cb(err);
              cb(null, true, nextId);
            });
          }
        });
      });
    });
  }
  
  self.update = function(cb) {
    updateNextId(function(err, keepGoing, lastId) {
      if (err)
        return cb(err);
      if (keepGoing)
        return self.update(cb);
      cb(null, lastId);
    });
  };
  
  self.getSlice = function(start, stop, cb) {
    var args = [SORTEDSET_KEY, start, stop, "WITHSCORES"];
    client.zrange(args, function(err, results) {
      if (err)
        return cb(err);
      var pages = [];
      for (var i = 1; i < results.length; i += 2)
        pages.push(hashFinder.idToKey(parseInt(results[i])));
      cb(null, pages);
    });
  };
  
  self.getLength = function(cb) {
    client.zcard(SORTEDSET_KEY, function(err, count) {
      if (err)
        return cb(err);
      cb(null, parseInt(count));
    });
  };
  
  self.flush = function(cb) {
    client.del([LASTID_KEY, SORTEDSET_KEY], cb);
  };

  return self;
}

function PublishedPageTracker(options) {
  options = options || {};
  
  var start = options.startIndex || 1,
      batchSize = options.batchSize || 10,
      retryDelay = options.retryDelay || 30000,
      hashFinder = options.hashFinder || HashFinder(),
      uniquePageTracker = UniquePageTracker({hashFinder: hashFinder});
  
  function getNextBatch(i) {
    hashFinder.findManyHashes(i, batchSize, function(errors, hashes) {
      if (options.verbose)
        console.log("got hashes for " + i + " thru " + (i+batchSize) +
                    "; " + errors.length + " errors.");
      uniquePageTracker.update(function(err, lastId) {
        if (err)
          console.log("unique page tracker failed to update: " + err);
        if (errors.length) {
          if (options.verbose)
            console.log("retrying in " + retryDelay + " ms.");
          setTimeout(function() {
            getNextBatch(i);
          }, retryDelay);
        } else
          getNextBatch(i+batchSize);
      });
    });
  }
  
  getNextBatch(start);

  return {
    pageExists: hashFinder.hashExists,
    getUniquePageCount: uniquePageTracker.getLength,
    getUniquePageSlice: uniquePageTracker.getSlice
  };
}

module.exports = PublishedPageTracker;
PublishedPageTracker.makeRedisClient = makeRedisClient;
PublishedPageTracker.HashFinder = HashFinder;
PublishedPageTracker.UniquePageTracker = UniquePageTracker;

if (!module.parent)
  PublishedPageTracker({verbose: true});
