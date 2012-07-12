var globalConfig = require('./config'),
    redis = require('redis');

exports.makeClient = function(config) {
  config = config || globalConfig.redis;

  var client = redis.createClient(config.port, config.host);
  client.on('error', function(err) {
    console.log("REDIS ERROR", err);
  });
  return client;
};

exports.flushKeys = function(client, query, cb) {
  client.keys(query, function(err, keys) {
    if (err)
      return cb(err);
    if (keys.length)
      client.del(keys, cb);
    else
      cb(null);
  });
};
