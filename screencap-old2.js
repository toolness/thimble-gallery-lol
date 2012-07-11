var page = require('webpage').create(),
    system = require('system'),
    url = system.args[1],
    image = system.args[2];

page.viewportSize = {
  width: 800,
  height: 600
};

setTimeout(function() {
  console.log("page is taking way too long to load, exiting.");
  phantom.exit(2);
}, 10000);

page.open(url, function(status) {
  if (status != "success") {
    console.log("FAIL");
    phantom.exit(1);
  } else {
    console.log("rendering " + url + " to " + image);
    page.render(image);
    phantom.exit(0);
  }
});
