var rebase = require('./rebase'),
    config = require('./config'),
    PublishedPageTracker = require('./published-page-tracker'),
    fs = require('fs');

var HASH_DIR = config.hashDir + "/";

function FS_hashExists(key, cb) {
  fs.exists(HASH_DIR + key, cb);
}

function FS_readHash(key, cb) {
  fs.readFile(HASH_DIR + key, 'utf-8', cb);
}

var lastConverted = 0;

function convertNextHash() {
  var id = ++lastConverted;
  var key = rebase(id);
  FS_hashExists(key, function(exists) {
    if (exists)
      FS_readHash(key, function(err, hash) {
        if (err)
          throw new Error("FAILED to read key", key);
        PublishedPageTracker.writeHash(key, hash, function(err) {
          if (err)
            throw new Error("FAILED to write key", key);
          console.log("wrote id", id, "- key", key, "with hash", hash);
          convertNextHash();
        });
      });
    else {
      console.log("Saving DB...");
      PublishedPageTracker.client.save(function(err) {
        if (err)
          throw new Error("Saving failed", err);
        console.log("Success. Exiting...");
        PublishedPageTracker.client.quit();
      });
    }
  });
}

convertNextHash();
