const mitmdump = require('./bin/mitmdump')
const got = require('got')
const HttpProxyAgent = require('http-proxy-agent')
const assert = require('assert')

describe('mitmdump', () => {
  let agent
  function $got(url, options) {
    options = options || {}
    options.agent = agent
    options.followRedirect = false
    return got(url, options)
  }
  before('prepare environment', () => {
    const address = mitmdump.address()
    agent = new HttpProxyAgent(`http://localhost:${address.port}`)
  })
  describe('general proxy', () => {
    it('should bypass and record request', async () => {
      const response = await $got('http://nodejs.org/dist/')
      assert.equal(response.statusCode, 200)
      assert(response.headers)
      assert(response.body)
    })
  })
  describe('redirect', () => {
    it('should not be followed', async () => {
      const response = await $got('http://nodejs.org/dist')
      assert.equal(response.statusCode, 301)
      assert(response.headers)
      assert.equal(response.headers.location, 'http://nodejs.org/dist/')
    })
  })
  describe('http2https proxy', () => {
    it('should rewrite and record request', async () => {
      const response = await $got('http://crzidea.com?test')
      assert.equal(response.statusCode, 200)
      assert(response.headers)
      assert(response.body)
    })
  })
})
