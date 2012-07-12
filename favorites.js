var redisUtils = require('./redis-utils');

module.exports = function Favorites(client, namespace, now) {
  now = now || Date.now;

  var self = {};
  var REDIS_PREFIX = "faves:" + namespace + ":",
      SCORE_KEY = REDIS_PREFIX + "score",
      TIME_KEY = REDIS_PREFIX + "last-updated";

  self.favorite = function(key, cb) {
    client.zincrby(SCORE_KEY, 1, key, function(err) {
      if (err) return cb(err);
      client.zadd(TIME_KEY, now(), key, cb);
    });
  };

  self.unfavorite = function(key, cb) {
    client.zincrby(SCORE_KEY, -1, key, cb);
  };

  self.getMostPopular = function(cb) {
    var args = [SCORE_KEY, 0, -1, "WITHSCORES"];
    client.zrevrange(args, function(err, results) {
      if (err)
        return cb(err);
      var mostPopular = [];
      for (var i = 0; i < results.length; i += 2) {
        var score = parseInt(results[i+1]);
        if (score > 0)
          mostPopular.push([results[i], score]);
      }
      cb(null, mostPopular);
    });
  };

  self.getRecentActivity = function(cb) {
    client.zrevrange([TIME_KEY, 0, -1], cb);
  };

  self.flush = function(cb) {
    redisUtils.flushKeys(client, REDIS_PREFIX + "*", cb);
  };
  
  return self;
}
