var PAGE_SIZE = 20;

window.App = Ember.Application.create();

function show(end) {
  var start = end - PAGE_SIZE;
  if (start <= 0)
    start = 1;
  if (start > 1)
    $("#more").attr("href", "?p=" + start).show();
  $.getJSON('/unique/' + start + '/' + PAGE_SIZE, function(data) {
    data.reverse();
    data.forEach(function(key) {
      var view = Ember.View.create({
        templateName: "thumbnail",
        viewURL: 'https://thimble.webmaker.org/p/' + key,
        thumbnailURL: '/images/' + key + '.png'
      });
      view.appendTo('ul.thumbnails');
    });
  });
}

$(window).ready(function() {
  // http://stevenbenner.com/?p=634
  var queryString = {};
  window.location.href.replace(
    new RegExp("([^?=&]+)(=([^&]*))?", "g"),
    function($0, $1, $2, $3) { queryString[$1] = decodeURIComponent($3); }
  );
  var end = parseInt(queryString.p);
  if (!isNaN(end))
    show(end);
  else
    $.getJSON('/stats', function(stats) {
      show(stats.uniques);
    });
});
