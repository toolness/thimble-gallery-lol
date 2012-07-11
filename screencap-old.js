var page = require('webpage').create(),
    system = require('system'),
    pageIds = system.args.slice(1);

page.viewportSize = {
  width: 800,
  height: 600
};

function renderNextPage() {
  if (pageIds.length == 0)
    return phantom.exit();
  var pageId = pageIds.pop();
  page.open("https://thimble.webmaker.org/p/" + pageId, function(status) {
    if (status != "success") {
      console.log("FAIL");
    } else {
      console.log("rendering " + pageId);
      page.render(pageId + ".jpg");
      renderNextPage();
    }
  });
}

renderNextPage();
