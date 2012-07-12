var PAGE_SIZE = 20;

var App = Ember.Application.create();

var ThimblePage = Ember.Object.extend({
  key: null,
  score: null,
  isFavorite: null,
  favoriteClass: function() {
    return this.get('isFavorite') ? "icon-star" : "icon-star-empty";
  }.property('isFavorite'),
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

function show(end) {
  var start = end - PAGE_SIZE;
  if (start <= 0)
    start = 1;
  if (start > 1)
    $("#more").attr("href", "?p=" + start).show();
  $.getJSON('/unique/' + start + '/' + PAGE_SIZE, function(data) {
    var thumbnails = Ember.View.create({
      templateName: 'thumbnails',
      pages: [],
      toggleFavorite: function(event) {
        var page = event.context;
        page.set('isFavorite', !page.get('isFavorite'));
      }
    }).appendTo('#thumbnails-splat');
    data.reverse();
    data.forEach(function(info) {
      var FAVORITE_KEY = 'ThimblePage_favorite_' + info[0];
      var page = ThimblePage.create({
        key: info[0],
        score: info[1],
        isFavorite: FAVORITE_KEY in localStorage
      });
      page.addObserver('isFavorite', function() {
        if (this.get('isFavorite')) {
          try { localStorage[FAVORITE_KEY] = "YUP"; } catch (e) {}
          jQuery.post('/favorite/' + this.get('key'), function() {
            page.set('score', page.get('score') + 1);
          });
        } else {
          delete localStorage[FAVORITE_KEY];
          jQuery.post('/unfavorite/' + this.get('key'), function() {
            page.set('score', page.get('score') - 1);
          });
        }
      });
      thumbnails.pages.pushObject(page);
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
