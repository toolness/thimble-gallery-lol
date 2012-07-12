var expect = require('expect.js'),
    Favorites = require('../favorites'),
    redisUtils = require('../redis-utils');

describe('Favorites', function() {
  var client = redisUtils.makeClient(),
      now = 0,
      faves = Favorites(client, 'test-faves', function() {
        return now++;
      });

  beforeEach(function(done) {
    now = 0;
    faves.flush(done);
  });

  it('should favorite', function(done) {
    faves.favorite('a', function(err) {
      if (err) done(err);
      faves.getMostPopular(function(err, list) {
        if (err) done(err);
        expect(list).to.be.eql([['a', 1]]);
        done();
      });
    });
  });

  it('should order favorites by popularity', function(done) {
    faves.favorite('a', function(err) {
      if (err) done(err);
      faves.favorite('a', function(err) {
        if (err) done(err);
        faves.favorite('b', function(err) {
          if (err) done(err);
          faves.getMostPopular(function(err, list) {
            if (err) done(err);
            expect(list).to.be.eql([['a', 2], ['b', 1]]);
            done();
          });
        });
      });
    });
  });

  it('should order favorites by most recent activity', function(done) {
    faves.favorite('a', function(err) {
      if (err) done(err);
      expect(now).to.be(1);
      faves.favorite('b', function(err) {
        if (err) done(err);
        expect(now).to.be(2);
        faves.getRecentActivity(function(err, list) {
          if (err) done(err);
          expect(list).to.be.eql(['b', 'a']);
          done();
        });
      });
    });
  });

  it('should unfavorite', function(done) {
    faves.favorite('a', function(err) {
      if (err) done(err);
      faves.unfavorite('a', function(err) {
        faves.getMostPopular(function(err, list) {
          if (err) done(err);
          expect(list).to.be.eql([]);
          done();
        });
      });
    });
  });
});
