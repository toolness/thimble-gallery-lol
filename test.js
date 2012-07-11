var assert = require('assert'),
    fs = require('fs'),
    config = require('./config');

assert(fs.existsSync(config.imageDir));
assert(fs.existsSync(config.hashDir));

console.log('all tests pass!');
