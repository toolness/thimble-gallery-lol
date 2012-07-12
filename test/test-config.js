var expect = require('expect.js'),
    fs = require('fs'),
    PublishedPageTracker = require('../published-page-tracker'),
    config = require('../config');

describe('config.imageDir', function() {
  it('should exist on filesystem', function() {
    expect(fs.existsSync(config.imageDir)).to.be.ok();
  });
});

describe('redis', function() {
  it('should respond to PING', function(done) {
    var client = PublishedPageTracker.makeRedisClient(config.redis);

    client.ping(function(err, response) {
      expect(err).to.be(null);
      expect(response).to.be("PONG");
      done();
    });
  });
});
