const fs = require('fs')
const path = require('path')
const glob = require('glob')
const extend = require('util-extend')
const Through = require('through2')
const yamlFront = require('yaml-front-matter')
const PluginError = require('gulp-util').PluginError
const md = require('markdown-it')({
  html: true,
  linkify: true,
  typographer: true
})

module.exports = (() => {
  const err = message => {
    throw new PluginError('gulp-mvb', message, false)
  }

  // takes an array of globs or a single glob as a string
  // and returns an array with the article file paths.
  const findArticles = globs => {
    return globs.reduce((list, pattern) => {
      return list.concat(glob.sync(pattern))
    }, [])
  }

  const loadArticles = (globs, permalink, loaded) => {
    const files = findArticles(globs)
    let prevArticle

    return files.map(file => {
      const article = loadArticle(file, permalink, loaded)

      // mark previous and next articles
      if (prevArticle) {
        prevArticle.nextArticle = article
      }
      article.previousArticle = prevArticle
      prevArticle = article

      return article
    })
  }

  // loads an article by its file path and returns an object
  // with the rendered markdown and the article meta data.
  const loadArticle = (filePath, permalink, loaded) => {
    const input = fs.readFileSync(filePath)
    const article = yamlFront.loadFront(input)
    const fileName = path.basename(filePath)
    const fileInfo = fileName.match(/(\d{4}-\d{2}-\d{2})-(.*)\./)

    // infer missing infos from filename
    if (!article.id) article.id = fileInfo[2]
    if (!article.date) article.date = new Date(fileInfo[1])

    article.fileName = fileName
    article.permalink = permalink(article)
    article.content = md.render(article.__content)
    delete article.__content

    // check for more marker and infer description
    const more = /<!-- more -->/i
    const desc = article.content.match(more)
    if (desc && desc.index) {
      article.content = article.content.replace(more, '<div id="more"></div>')

      if (!article.description) {
        article.description = desc.input
          .substring(0, desc.index)
          .replace(/(<([^>]+)>)/ig, '')
          .trim()
      }
    }

    if (loaded) {
      loaded(article)
    }

    return article
  }

  // gulp pipe function
  return options => {
    if (!options.glob) { err('Missing glob option') }
    if (!options.template) { err('Missing template option') }
    if (typeof (options.permalink) !== 'function') { err('Missing permalink function') }
    if (options.loaded && typeof (options.loaded) !== 'function') { err('Loaded must be a function') }

    // ensure globs is an array
    if (!Array.isArray(options.glob)) options.glob = [options.glob]
    const globs = options.glob

    // read template
    const template = fs.readFileSync(options.template)

    // function to create article permalinks
    const permalink = options.permalink

    // function to group articles
    const grouping = options.grouping

    // function to highlight code blocks
    const highlight = options.highlight

    // function to modify article data
    const loaded = options.loaded

    // read articles only once, reverse and cache them
    const articles = loadArticles(globs, permalink, loaded).reverse()

    // map article filenames to its object for lookup in stream
    const map = articles.reduce((mapped, article) => {
      mapped[article.fileName] = article
      return mapped
    }, {})

    // grouping
    let groupedArticles
    if (typeof (grouping) === 'function') {
      groupedArticles = grouping(articles)
    }

    // highlighting
    if (typeof (highlight) === 'function') {
      md.set({ highlight })
    }

    return Through.obj((file, unused, callback) => {
      // lookup article by its file name
      var article = map[path.basename(file.path)]

      // assign articles data to the file object so that it will be
      // available in the template during rendering.
      if (!file.data) { file.data = {} }
      file.data.mvb = {
        articles: articles,
        groupedArticles: groupedArticles
      }

      if (article) {
        // assign article data
        file.data.mvb = extend(file.data.mvb, { article: article })

        // set the file's path to the permalink
        file.path = path.join(file.base, path.basename(article.permalink))

        // assign template contents to the file so that it can get rendered
        file.contents = template
      }

      callback(null, file)
    })
  }
})()
