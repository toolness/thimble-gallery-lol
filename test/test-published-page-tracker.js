var expect = require('expect.js'),
    PublishedPageTracker = require('../published-page-tracker');
    
describe('published-page-tracker', function() {
  var hashFinder = PublishedPageTracker.HashFinder({
    baseThimbleURL: "http://test-thimble.testing.test/",
    idToKey: function(id) { return 'page_' + id; }
  });
  
  var uniquePageTracker = PublishedPageTracker.UniquePageTracker({
    hashFinder: hashFinder
  });
  
  beforeEach(function(done) {
    hashFinder.flushAllHashes(function(err) {
      if (err)
        return done(err);
      uniquePageTracker.flush(done);
    });
  });
  
  it('should read and write page hashes', function(done) {
    hashFinder.hashExists("page_1", function(exists) {
      expect(exists).to.be(false);
      hashFinder.writeHash("page_1", "hash_a", function(err) {
        expect(err).to.be(null);
        hashFinder.readHash("page_1", function(err, hash) {
          expect(err).to.be(null);
          expect(hash).to.be("hash_a");
          done();
        });
      });
    });
  });

  it('should not explode when no pages exist', function(done) {
    uniquePageTracker.update(function(err, lastId) {
      if (err) return done(err);
      expect(lastId).to.be(0);
      done();
    });
  });
  
  it('should track pages when one page exists', function(done) {
    hashFinder.writeHash('page_1', 'hash_a', function(err) {
      if (err) return done(err);
      uniquePageTracker.update(function(err, lastId) {
        if (err) return done(err);
        expect(lastId).to.be(1);
        done();
      });
    });
  });

  it('should track pages when two different ones exist', function(done) {
    hashFinder.writeHash('page_1', 'hash_a', function(err) {
      if (err) return done(err);
      hashFinder.writeHash('page_2', 'hash_b', function(err) {
        if (err) return done(err);
        uniquePageTracker.update(function(err, lastId) {
          if (err) return done(err);
          expect(lastId).to.be(2);
          uniquePageTracker.getSlice(0, -1, function(err, pages) {
            if (err) return done(err);
            expect(pages).to.be.eql(['page_1', 'page_2']);
            done();
          });
        });
      });
    });
  });

  it('should track pages when two identical ones exist', function(done) {
    hashFinder.writeHash('page_1', 'hash_a', function(err) {
      if (err) return done(err);
      hashFinder.writeHash('page_2', 'hash_a', function(err) {
        if (err) return done(err);
        uniquePageTracker.update(function(err, lastId) {
          if (err) return done(err);
          expect(lastId).to.be(2);
          uniquePageTracker.getSlice(0, -1, function(err, pages) {
            if (err) return done(err);
            expect(pages).to.be.eql(['page_1']);
            done();
          });
        });
      });
    });
  });
});
