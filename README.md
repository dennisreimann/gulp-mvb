# gulp-mvb

gulp-mvb is a [gulp](https://github.com/wearefractal/gulp) plugin for creating a *minimum viable blog*.

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Build Status](https://travis-ci.org/dennisreimann/gulp-mvb.svg?branch=master)](https://travis-ci.org/dennisreimann/gulp-mvb)
[![npm](https://img.shields.io/npm/v/gulp-mvb.svg)](https://www.npmjs.com/package/gulp-mvb)
[![npm](https://img.shields.io/npm/dw/gulp-mvb.svg)](https://www.npmjs.com/package/gulp-mvb)

## Dead simple blogging

It is made up of these parts which are connected to [DoTheSimplestThingThatCouldPossiblyWork](http://c2.com/xp/DoTheSimplestThingThatCouldPossiblyWork.html)(TM):

- **Markdown** for writing the articles
- **YAML Front Matter** for the article meta information
- **Jade** for the templates.
  This is optional and the library is supposed to work with other template languages as well, as long as they support [gulp-data](https://www.npmjs.com/package/gulp-data).
  I've only tested it with Jade, yet.
- **Gulp** to wire it together

In fact, this is the [Octopress](http://octopress.org/) way of writing articles, which I really like.
As I needed another foundation for building [my site and blog](https://github.com/dennisreimann/website/), I decided to use this approach and create a gulp-plugin for it.

## Conventions and assumptions

To keep it dead simple, here are the rules.
Articles...

- are written in Markdown
- have this filename pattern: `YYYY-MM-DD-ARTICLE_NAME.md`
- meta data is defined via YAML Front Matter

## Usage

Install with:

```bash
npm install gulp-mvb --save-dev
```
or

```bash
yarn add --dev gulp-mvb
```

### Example

For a full featured example of all the things described below see [my websites code](https://github.com/dennisreimann/website/).

### Gulpfile

Here is the TL;DR for how to use gulp-mvb in your gulpfile:

```javascript
import mvb from 'gulp-mvb';
import jade from 'gulp-jade';
import rename from 'gulp-rename';
import highlightjs from 'highlight.js';

const paths = {
  articles: ['src/articles/**/*.md'],
  feedTemplate: 'src/templates/atom.jade',
  articleTemplate: 'src/templates/article.jade',
  articlesBasepath: 'articles'
};

const mvbConf = {
  // glob that locates the article markdown files
  glob: paths.articles,
  // the template for an article page
  template: paths.articleTemplate,
  // callback function for generating an article permalink.
  // see docs below for info on the article properties.
  permalink(article) {
    return `/${paths.articlesBasepath}/${article.id}.html`;
  },
  // callback function to further modify an article after it has been loaded.
  loaded(article) {
    article.calculatedData = doSomething();
  },
  highlight(code, lang) {
    const languages = (lang != null) ? [lang] : undefined;
    return highlightjs.highlightAuto(code, languages).value;
  },
  // callback function for generating custom article groups.
  // access the return value via the groupedArticles property, so that you can
  // either return an array if you only have one group or return an object with
  // named groups in case you want to use multiple groups (by date, by tag, ...)
  grouping(articles) {
    const byYear = {};
    articles.forEach((article) => {
      let year = article.date.toISOString().replace(/-.*/, "");
      byYear[year] || (byYear[year] = []);
      return byYear[year].push(article);
    });
    return { byYear };
  }
}

gulp.task('articles', () =>
  gulp.src(paths.articles)
    .pipe(mvb(mvbConf))
    .pipe(jade())
    .pipe(gulp.dest(paths.articlesBasepath))
);

gulp.task('feed', () =>
  gulp.src(paths.feedTemplate)
    .pipe(mvb(mvbConf))
    .pipe(jade(pretty: true))
    .pipe(rename('atom.xml'))
    .pipe(gulp.dest())
);
```

See all of this in a broader context in [my websites gulpfile](https://github.com/dennisreimann/website/blob/master/gulpfile.babel.js).

### The `article` object

The article object has the following properties, which can be used in the template and permalink function:

- `id`: In case this is not set via front matter, it will be inferred from the articles file name (second part after date)
- `date`: In case this is not set via front matter, it will be inferred from the articles file name
- `permalink`: Gets generated via the permalink function
- `content`: The rendered content (HTML)
- `fileName`: You might want to use this in the permalink callback function
- `previousArticle`: The previous/earlier article
- `nextArticle`: The next/later article
- `description`: If you use the Wordpress style `<!-- more -->` marker in your content, the description will be set with the text up to the marker. The marker will get replaced with `<div id="more"></div>` so you can link to it by appending the `#more` hash to the permalink.

In addition to these properties, you will also have access to the ones you defined in the article's frontmatter.
To append further data, you can use the `loaded` callback function.

### An article/blogpost

This is what a simple article with some frontmatter could look like:

```markdown
---
title: Hello World
subtitle: Additional title
date: 2015-12-06
---

Here goes the markdown content that will be rendered as HTML...
```

### Templates

Your `articleTemplate` might be something like:

```jade
extends layout

block main
  article
    header
      h1= mvb.article.title
      - if mvb.article.subtitle
        h2= mvb.article.subtitle
    != mvb.article.content
    footer
      | Posted on
      time= mvb.article.date
```

As you can see the article data will be available in your template via the namespaced variable `mvb.article`.
This is to avoid collision of mvbs variables with other potential custom variables.

You can also use the `mvb.articles` list to generate an overview for all your articles or your `feedTemplate` (in this case atom):

```jade
doctype xml
feed(xmlns="http://www.w3.org/2005/Atom" xml:base="https://example.org")
  id https://example.org/atom.xml
  title Example Atom Feed
  updated= mvb.articles[0].date.toISOString()
  link(href="/")
  link(rel="self" href="/atom.xml")
  for article in mvb.articles
    entry
      id= article.id
      title= article.title
      link(href=article.permalink)
      updated= article.date.toISOString()
      content(type="html")= article.content
```

Jade can be used to compile XML as shown above too, but it will always give the resulting file the .html extension.
So you will need to rename the feed with [gulp-rename](https://www.npmjs.com/package/gulp-rename).

You can also use the `mvb.articles` list to embed a list of your blogposts in your sites pages:

```jade
ul
  for article in mvb.articles
    li
      a(href=article.permalink)= article.title
```

In case you defined a `grouping` callback in your config, you can access the grouped articles via the `mvb.groupedArticles` property.

To have access to the mvb variables you will need to use `.pipe(mvb(mvbConf))` in your gulp stream before rendering the templates.

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License)
