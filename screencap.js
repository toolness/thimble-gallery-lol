var page = require('webpage').create(),
    system = require('system'),
    server = require('webserver').create(),
    fs = require('fs'),
    jobs = [],
    failsSoFar = 0;

var MAX_FAILS = 10;

var config = (function() {
  var module = {};
  return eval(fs.read('config.js'));
})();

page.viewportSize = {
  width: 800,
  height: 600
};

page.clipRect = {
  top: 0,
  left: 0,
  width: 800,
  height: 600
};

service = server.listen(config.screencapPort, function(request, response) {
  var match = request.url.match(/^\/(.+)\/([A-Za-z0-9]+)$/);
  if (!match || match[1] != config.secret) {
    response.statusCode = 404;
    response.write('not found: ' + request.url);
    response.close();
    return;
  }
  jobs.push({
    req: request,
    res: response,
    key: match[2]
  });
  processNextJob();
});

var isProcessingJob = false;

function processNextJob() {
  if (isProcessingJob || jobs.length == 0)
    return;
  var job = jobs.pop();
  var url = config.baseThimbleURL + job.key;
  var filename = config.imageDir + "/" + job.key + ".png";
  isProcessingJob = true;
  console.log("loading " + url);
  page.open(url, function(status) {
    var statusCode;
    var output;
    
    if (status != "success") {
      statusCode = 500;
      output = "FAILED to load " + url;
    } else {
      try {
        page.render(filename);
        statusCode = 200;
        output = "saved " + url;
      } catch (e) {
        statusCode = 500;
        output = "FAILED to save " + url;
      }
    }
    
    try {
      console.log(statusCode + " " + output);
      job.res.statusCode = statusCode;
      job.res.write(output);
      job.res.close();
    } catch (e) {
      console.log("failed to provide response for " + url + ": " + e);
    }
    
    if (statusCode == 500 && ++failsSoFar > MAX_FAILS) {
      console.log("Maximum fails exceeded, bailing.");
      phantom.exit(1);
    }

    isProcessingJob = false;
    processNextJob();
  });
}
