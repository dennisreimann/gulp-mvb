'use strict';

var fs = require('fs');
var path = require('path');
var glob = require('glob');
var extend = require('util-extend');
var marked = require('marked');
var Through = require('through2');
var yamlFront = require('yaml-front-matter');
var PluginError = require('gulp-util').PluginError;

module.exports = (function() {
  var err = function(message) {
    throw new PluginError('gulp-mvb', message, false);
  };

  // takes an array of globs or a single glob as a string
  // and returns an array with the article file paths.
  var findArticles = function(globs) {
    return globs.reduce(function(list, pattern) {
      return list.concat(glob.sync(pattern))
    }, []);
  };

  var loadArticles = function(globs, permalink) {
    var files = findArticles(globs);
    var prevArticle;

    return files.map(function(file) {
      var article = loadArticle(file, permalink);

      // mark previous and next articles
      if (prevArticle) {
        prevArticle.nextArticle = article;
      }
      article.previousArticle = prevArticle;
      prevArticle = article;

      return article;
    });
  };

  // loads an article by its file path and returns an object
  // with the rendered markdown and the article meta data.
  var loadArticle = function(filePath, permalink) {
    var input = fs.readFileSync(filePath);
    var article = yamlFront.loadFront(input);
    var fileName = path.basename(filePath);
    var fileInfo = fileName.match(/(\d{4}-\d{2}-\d{2})-(.*)\./);

    // infer missing infos from filename
    if (!article.id) article.id = fileInfo[2];
    if (!article.date) article.date = new Date(fileInfo[1]);

    article.fileName = fileName;
    article.permalink = permalink(article);
    article.content = marked(article.__content);
    delete article.__content;

    // check for more marker and infer description
    var more = /<!-- more -->/i;
    var desc = article.content.match(more);
    if (desc && desc.index) {
      article.content = article.content.replace(more, '<div id="more"></div>');

      if (!article.description) {
        article.description = desc.input
          .substring(0, desc.index)
          .replace(/(<([^>]+)>)/ig, "")
          .trim();
      }
    }

    return article;
  };

  // gulp pipe function
  return function(options) {
    if (!options.glob) { err('Missing glob option') }
    if (!options.template) { err('Missing template option'); }
    if (typeof(options.permalink) != "function") { err('Missing permalink function'); }

    // ensure globs is an array
    if (!Array.isArray(options.glob)) options.glob = [options.glob];
    var globs = options.glob;

    // read template
    var template = fs.readFileSync(options.template);

    // function to create article permalinks
    var permalink = options.permalink;

    // function to group articles
    var grouping = options.grouping;

    // function to highlight code blocks
    var highlight = options.highlight;

    // read articles only once, reverse and cache them
    var articles = loadArticles(globs, permalink).reverse();

    // map article filenames to its object for lookup in stream
    var map = articles.reduce(function(mapped, article) {
      mapped[article.fileName] = article;
      return mapped;
    }, {});

    // grouping
    var groupedArticles;
    if (typeof(grouping) === "function") {
      groupedArticles = grouping(articles);
    }

    // highlighting
    if (typeof(highlight) === "function") {
      marked.setOptions({ highlight: highlight });
    }

    return Through.obj(function(file, unused, callback) {
      // lookup article by its file name
      var article = map[path.basename(file.path)];

      // assign articles data to the file object so that it will be
      // available in the template during rendering.
      if (!file.data) { file.data = {}; }
      file.data.mvb = {
        articles: articles,
        groupedArticles: groupedArticles
      };

      if (article) {
        // assign article data
        file.data.mvb = extend(file.data.mvb, { article: article });

        // set the file's path to the permalink
        file.path = path.join(file.base, path.basename(article.permalink));

        // assign template contents to the file so that it can get rendered
        file.contents = template;
      }

      callback(null, file);
    });
  };
})();
