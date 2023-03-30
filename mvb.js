const { readFileSync } = require('fs')
const { basename } = require('path')
const glob = require('glob')
const yamlFront = require('yaml-front-matter')

const md = require('markdown-it')({
  html: true,
  linkify: true,
  typographer: true
})

// takes an array of globs or a single glob as a string
// and returns an array with the article file paths.
const findArticles = globs => {
  return globs.reduce((list, pattern) => {
    return list.concat(glob.sync(pattern))
  }, [])
}

// loads an article by its file path and returns an object
// with the rendered markdown and the article meta data.
const loadArticle = (filePath, permalink, loaded) => {
  const input = readFileSync(filePath)
  const article = yamlFront.loadFront(input)
  const fileName = basename(filePath)
  const fileInfo = fileName.match(/(?:(\d{4}-\d{2}-\d{2})-)?(.*)\./)

  // infer missing infos from filename
  if (!article.id) article.id = fileInfo[2]
  if (!article.date && fileInfo[1]) article.date = new Date(fileInfo[1])

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
        .replace(/(<([^>]+)>)/gi, '')
        .trim()
    }
  }

  if (loaded) {
    loaded(article)
  }

  return article
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

module.exports = options => {
  // ensure globs is an array
  if (!Array.isArray(options.glob)) options.glob = [options.glob]
  const globs = options.glob

  // function to create article permalinks
  const { permalink } = options

  // function to modify article data
  const { loaded } = options

  // function to highlight code blocks
  const { highlight } = options

  if (typeof highlight === 'function') {
    md.set({ highlight })
  }

  // plugins
  ;(options.plugins || []).forEach(plugin => {
    if (!Array.isArray(plugin)) {
      plugin = [plugin]
    }

    if (typeof plugin[0] === 'string') {
      plugin[0] = require(plugin[0])
    }

    md.use(...plugin)
  })

  // enable/disable rules
  ;(options.enable || []).forEach(rule => {
    md.enable(...(Array.isArray(rule) ? rule : [rule]))
  })
  ;(options.disable || []).forEach(rule => {
    md.disable(...(Array.isArray(rule) ? rule : [rule]))
  })

  const articles = loadArticles(globs, permalink, loaded)

  return {
    articles
  }
}
