var redisUtils = require('./redis-utils');

module.exports = function Favorites(client, namespace, now) {
  now = now || Date.now;

  var self = {};
  var REDIS_PREFIX = "faves:" + namespace + ":",
      SCORE_SET_KEY = REDIS_PREFIX + "score-set",
      SCORE_HASH_KEY = REDIS_PREFIX + "score-hash",
      TIME_KEY = REDIS_PREFIX + "last-updated";

  self.favorite = function(key, cb) {
    client.zincrby(SCORE_SET_KEY, 1, key, function(err) {
      if (err) return cb(err);
      client.hincrby(SCORE_HASH_KEY, key, 1, function(err) {
        if (err) return cb(err);
        client.zadd(TIME_KEY, now(), key, cb);
      });
    });
  };

  self.unfavorite = function(key, cb) {
    client.zincrby(SCORE_SET_KEY, -1, key, function(err) {
      if (err) return cb(err);
      client.hincrby(SCORE_HASH_KEY, key, -1, cb);
    });
  };

  self.getMostPopular = function(cb) {
    var args = [SCORE_SET_KEY, 0, -1, "WITHSCORES"];
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

  self.scoresForKeys = function(list, cb) {
    var args = [SCORE_HASH_KEY].concat(list);
    client.hmget(args, function(err, scores) {
      if (err) return cb(err);

      var newList = [];
      for (var i = 0; i < list.length; i++)
        newList.push([list[i], parseInt(scores[i] || '0')]);
      cb(null, newList);
    });
  };
  
  self.getRecentActivity = function(cb) {
    client.zrevrange([TIME_KEY, 0, -1], function(err, list) {
      if (err) return cb(err);
      self.scoresForKeys(list, function(err, keysWithScores) {
        if (err) return cb(err);
        cb(null, keysWithScores.filter(function(pair) {
          return pair[1] > 0;
        }));
      });
    });
  };

  self.flush = function(cb) {
    redisUtils.flushKeys(client, REDIS_PREFIX + "*", cb);
  };
  
  return self;
}
