var expect = require('expect.js'),
    PublishedPageTracker = require('../published-page-tracker');
    
describe('HashFinder', function() {
  it('should work', function(done) {
    var hashFinder = PublishedPageTracker.HashFinder({
      baseThimbleURL: "http://test-thimble.testing.test/"
    });
    hashFinder.flushAllHashes(function(err) {
      expect(err).to.be(null);
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
  });
});
