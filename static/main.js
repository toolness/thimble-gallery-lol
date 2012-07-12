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

function showThumbnails(data) {
  var thumbnails = Ember.View.create({
    templateName: 'thumbnails',
    pages: [],
    toggleFavorite: function(event) {
      var page = event.context;
      page.set('isFavorite', !page.get('isFavorite'));
    }
  }).appendTo('#thumbnails-splat');
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
}

function showRecentlyPublished(end) {
  var start = end - PAGE_SIZE;
  if (start <= 0)
    start = 1;
  if (start > 1)
    $("#more").attr("href", "?p=" + start).show();
  $.getJSON('/unique/' + start + '/' + PAGE_SIZE, function(data) {
    data.reverse();
    showThumbnails(data);
  });
}

// http://www.mredkj.com/javascript/nfbasic.html
function addCommas(nStr) {
  nStr += '';
  x = nStr.split('.');
  x1 = x[0];
  x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }
  return x1 + x2;
}

$(window).ready(function() {
  // http://stevenbenner.com/?p=634
  var queryString = {};
  window.location.href.replace(
    new RegExp("([^?=&]+)(=([^&]*))?", "g"),
    function($0, $1, $2, $3) { queryString[$1] = decodeURIComponent($3); }
  );
  
  $.getJSON('/stats', function(stats) {
    $("#page-count").text(addCommas(stats.uniques));
    if (location.pathname == '/' || location.pathname == '/index.html') {
      var end = parseInt(queryString.p);
      if (!isNaN(end))
        showRecentlyPublished(end);
      else
        showRecentlyPublished(stats.uniques);
      $(".nav-home").addClass("active");
    } else if (location.pathname == '/popular') {
      jQuery.getJSON('/favorites/popular', showThumbnails);
      $(".nav-popular").addClass("active");
    } else if (location.pathname == '/recent-favorites') {
      jQuery.getJSON('/favorites/activity', showThumbnails);
      $(".nav-recent-favorites").addClass("active");
    } else {
      var match = location.pathname.match(/\/p\/([A-Za-z0-9]+)/);
      if (match)
        jQuery.getJSON('/favorites/scores?keys=' + match[1], showThumbnails);
    }
  });
});
