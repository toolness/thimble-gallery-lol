var PAGE_SIZE = 20;

var App = Ember.Application.create();

var ThimblePage = Ember.Object.extend({
  key: null,
  viewURL: function() {
    return 'https://thimble.webmaker.org/p/' + this.get('key');
  }.property('key'),
  remixURL: function() {
    return this.get('viewURL') + '/edit';
  }.property('key'),
  thumbnailURL: function() {
    return '/images/' + this.get('key') + '.png';
  }.property('key')
});

App.thimblePageController = Ember.Object.create({
  pages: []
});

function show(end) {
  var start = end - PAGE_SIZE;
  if (start <= 0)
    start = 1;
  if (start > 1)
    $("#more").attr("href", "?p=" + start).show();
  $.getJSON('/unique/' + start + '/' + PAGE_SIZE, function(data) {
    data.reverse();
    data.forEach(function(key) {
      App.thimblePageController.pages.pushObject(ThimblePage.create({
        key: key
      }));
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
