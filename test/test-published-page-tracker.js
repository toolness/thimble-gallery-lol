var expect = require('expect.js'),
    PublishedPageTracker = require('../published-page-tracker');
    
describe('published-page-tracker', function() {
  var hashFinder = PublishedPageTracker.HashFinder({
    baseThimbleURL: "http://test-thimble.testing.test/",
    idToKey: function(id) { return 'page_' + id; }
  });
  
  var uniqueHashTracker = PublishedPageTracker.UniqueHashTracker({
    hashFinder: hashFinder
  });
  
  beforeEach(function(done) {
    hashFinder.flushAllHashes(function(err) {
      if (err)
        return done(err);
      uniqueHashTracker.flush(done);
    });
  });
  
  it('should read and write hashes', function(done) {
    hashFinder.hashExists("BOOP", function(exists) {
      expect(exists).to.be(false);
      hashFinder.writeHash("BOOP", "u", function(err) {
        expect(err).to.be(null);
        hashFinder.readHash("BOOP", function(err, hash) {
          expect(err).to.be(null);
          expect(hash).to.be("u");
          done();
        });
      });
    });
  });

  it('should track hashes when no pages exist', function(done) {
    uniqueHashTracker.update(function(err, lastId) {
      if (err) return done(err);
      expect(lastId).to.be(0);
      done();
    });
  });
  
  it('should track hashes when one page exists', function(done) {
    hashFinder.writeHash('page_1', 'hash_a', function(err) {
      if (err) return done(err);
      uniqueHashTracker.update(function(err, lastId) {
        if (err) return done(err);
        expect(lastId).to.be(1);
        done();
      });
    });
  });

  it('should track hashes when two different pages exist', function(done) {
    hashFinder.writeHash('page_1', 'hash_a', function(err) {
      if (err) return done(err);
      hashFinder.writeHash('page_2', 'hash_b', function(err) {
        if (err) return done(err);
        uniqueHashTracker.update(function(err, lastId) {
          if (err) return done(err);
          expect(lastId).to.be(2);
          uniqueHashTracker.getSlice(0, -1, function(err, pages) {
            if (err) return done(err);
            expect(pages).to.be.eql(['page_1', 'page_2']);
            done();
          });
        });
      });
    });
  });

  it('should track hashes when two identical pages exist', function(done) {
    hashFinder.writeHash('page_1', 'hash_a', function(err) {
      if (err) return done(err);
      hashFinder.writeHash('page_2', 'hash_a', function(err) {
        if (err) return done(err);
        uniqueHashTracker.update(function(err, lastId) {
          if (err) return done(err);
          expect(lastId).to.be(2);
          uniqueHashTracker.getSlice(0, -1, function(err, pages) {
            if (err) return done(err);
            expect(pages).to.be.eql(['page_1']);
            done();
          });
        });
      });
    });
  });
});
