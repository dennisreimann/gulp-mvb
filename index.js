const Through = require('through2')
const { readFileSync } = require('fs')
const { basename, join } = require('path')
const { PluginError } = require('gulp-util')

const MVB = require('./mvb')

const err = message => {
  throw new PluginError('gulp-mvb', message, false)
}

// gulp pipe function
module.exports = options => {
  if (!options.glob) { err('Missing glob option') }
  if (!options.template) { err('Missing template option') }
  if (typeof (options.permalink) !== 'function') { err('Missing permalink function') }
  if (options.loaded && typeof (options.loaded) !== 'function') { err('Loaded must be a function') }

  // read template
  const template = readFileSync(options.template)

  const mvb = MVB(options)

  // read articles only once, reverse and cache them
  const articles = mvb.articles.reverse()

  // map article filenames to its object for lookup in stream
  const map = articles.reduce((result, article) =>
    Object.assign(result, { [article.fileName]: article })
  , {})

  // grouping
  const { grouping } = options
  const groupedArticles = typeof (grouping) === 'function'
    ? grouping(articles)
    : null

  return Through.obj((file, unused, callback) => {
    // lookup article by its file name
    const article = map[basename(file.path)]

    // assign articles data to the file object so that it will be
    // available in the template during rendering.
    if (!file.data) { file.data = {} }
    file.data.mvb = {
      articles: articles,
      groupedArticles: groupedArticles
    }

    if (article) {
      // assign article data
      file.data.mvb = Object.assign(file.data.mvb, { article })

      // set the file's path to the permalink
      file.path = join(file.base, basename(article.permalink))

      // assign template contents to the file so that it can get rendered
      file.contents = template
    }

    callback(null, file)
  })
}
