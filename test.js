var assert = require('assert'),
    fs = require('fs'),
    PublishedPageTracker = require('./published-page-tracker'),
    config = require('./config');

console.log("verifying existence of", config.imageDir);
assert(fs.existsSync(config.imageDir));

console.log("verifying redis server configuration");

var client = PublishedPageTracker.client;

client.ping(function(err, response) {
  assert(!err);
  assert.equal(response, "PONG");
  client.quit();
  console.log('all tests pass!');
});
