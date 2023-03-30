/* globals expect, test */
const { join } = require('path')
const MVB = require('../mvb')

test('#loadArticles', () => {
  const options = {
    glob: join(__dirname, 'fixtures', '*.md'),
    permalink: article => `/articles/${article.id}.html`
  }
  const mvb = MVB(options)

  expect(mvb.articles.length).toEqual(3)

  expect(mvb.articles[0].title).toEqual('Hello World')
  expect(mvb.articles[0].subtitle).toEqual('Starting my new blog')
  expect(mvb.articles[0].description).toEqual(
    'Hello everyone, I’m starting a new blog!'
  )
  expect(mvb.articles[0].date).toEqual(new Date('2017-10-13'))
  expect(mvb.articles[0].content).toMatchSnapshot()

  expect(mvb.articles[1].title).toEqual('My second article')
  expect(mvb.articles[1].description).toEqual('This is going to be a thing!')
  expect(mvb.articles[1].date).toEqual(new Date('2017-10-14 12:34:56.000Z'))
  expect(mvb.articles[1].content).toMatchSnapshot()

  expect(mvb.articles[2].title).toEqual('No date')
  expect(mvb.articles[2].description).toBe(undefined)
  expect(mvb.articles[2].date).toBe(undefined)
  expect(mvb.articles[2].content).toMatchSnapshot()
})
