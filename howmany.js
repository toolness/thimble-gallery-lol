var rebase = require('./rebase'),
    https = require('https');

var INCREMENT_SIZE = 1000;

var currId = 1;

function newReq() {
  var req = https.request({
    host: 'thimble.webmaker.org',
    port: 443,
    path: '/p/' + rebase(currId),
    method: 'HEAD'
  }, function(res) {
    if (res.statusCode != 200) {
      console.log("Looks like there are at least " + currId +
                  " published pages.");
      return process.exit(0);
    }
    console.log("There are at least " + currId + " published pages.");
    currId += INCREMENT_SIZE;
    newReq();
  });
  req.end();
};

newReq();
