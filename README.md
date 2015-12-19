# gulp-mvb

gulp-mvb is a [gulp](https://github.com/wearefractal/gulp) plugin for creating a *minimum viable blog*.

## Dead simple blogging

It is made up of these parts which are connected to [DoTheSimplestThingThatCouldPossiblyWork](http://c2.com/xp/DoTheSimplestThingThatCouldPossiblyWork.html)(TM):

* **Markdown** for writing the articles
* **YAML Front Matter** for the article meta information
* **Jade** for the templates. This is optional and the library is supposed to work with other template languages as well, as long as they support [gulp-data](https://www.npmjs.com/package/gulp-data). I've only tested it with Jade, yet.
* **Gulp** to wire it together

## Conventions and assumptions

To keep it dead simple, here are the rules. Articles...

* are written in Markdown
* have this filename pattern: `YYYY-MM-DD-ARTICLE_NAME.md`
* meta data is defined via YAML Front Matter

## Usage

Install with:

    npm install gulp-mvb --save-dev

And use the plugin in your gulp stream:

```javascript
var mvb = require("gulp-mvb");
var jade = require("gulp-jade");
var rename = require("gulp-rename");

var paths = {
  articles: ["src/articles/**/*.md"],
  feedTemplate: "src/templates/atom.jade",
  articleTemplate: "src/templates/article.jade",
  articlesBasepath: "articles"
};

var mvbConf = {
  // glob that locates the article markdown files
  glob: paths.articles,
  // the template for an article page
  template: paths.articleTemplate,
  // callback function for generating an article permalink. see docs below for info on properties.
  permalink: (article) ->
    "/#{paths.articlesBasepath}/#{article.id}.html"
}

gulp.task("articles", function() {
  gulp.src(paths.articles)
    .pipe(mvb(mvbConf))
    .pipe(jade())
    .pipe(gulp.dest(paths.articlesBasepath));
});

gulp.task("feed", function() {
  gulp.src(paths.feedTemplate)
    .pipe(mvb(mvbConf))
    .pipe(jade(pretty: true))
    .pipe(rename("atom.xml"))
    .pipe(gulp.dest());
});
```

The article object has the following properties, which can be used in the template and permalink function:

* `id`: In case this is not set via front matter, it will be inferred from the articles file name (second part after date)
* `date`: In case this is not set via front matter, it will be inferred from the articles file name
* `permalink`: Gets generated via the permalink function
* `content`: The rendered content (HTML)
* `fileName`: You might want to use this in the permalink callback function

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License)
