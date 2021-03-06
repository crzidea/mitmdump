const mitmdump = require('./bin/mitmdump')
const got = require('got')
const WebSocket = require('ws')
const HttpProxyAgent = require('http-proxy-agent')
const assert = require('assert')
const elasticsearch = require('./lib/middleware.d/elasticsearch.js')

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
      assert.equal(response.headers.location, 'http://nodejs.org/dist/')
    })
    it('should be replaced (https)', async () => {
      const response = await $got('http://t.cn/aktT6M')
      assert.equal(response.statusCode, 302)
      assert.equal(response.headers.location, 'http://github.com')
    })
  })

  describe('HEAD method', () => {
    it('should bypass', async () => {
      const response = await $got('http://nodejs.org/dist', {method: 'HEAD'})
      assert.equal(response.statusCode, 301)
      assert(response.headers)
      assert.equal(response.headers.location, 'http://nodejs.org/dist/')
    })
  })

  describe('http2https proxy', () => {
    it('should rewrite and record request, html', async () => {
      const response = await $got('http://github.com?test')
      assert.equal(response.statusCode, 200)
      assert(response.headers)
      assert(response.headers['x-mitm-valuable'])
      assert(response.body)
    })
    it('should rewrite and record request, javascript', async () => {
      const response = await $got('http://crzidea.com/js/main.js')
      assert.equal(response.statusCode, 200)
      assert(response.headers)
      assert(response.headers['x-mitm-valuable'])
      assert(response.body)
    })
    it('should rewrite and record request, json', async () => {
      const response = await $got(
        'http://api.github.com/_private/browser/stats',
        {
          json: true,
          body: {}
        }
      )
      assert.equal(response.statusCode, 200)
      assert(response.headers)
      assert(response.headers['x-mitm-valuable'])
      assert(response.body)
    })
    it('should rewrite and record request, image', async () => {
      const response = await $got('http://assets-cdn.github.com/images/modules/site/universe-logo.png')
      assert.equal(response.statusCode, 200)
      assert(response.headers)
      assert(response.body)
    })
    it('should not rewrite, blob', async () => {
      let response = await $got(
        'http://api.github.com/_private/browser/stats',
        {
          method: 'POST',
          body: new Buffer(10)
        }
      )
      assert.equal(response.statusCode, 301)
      assert(response.headers.location)
    })
  })

  describe('gzip', () => {
    it('should be able to record', async () => {
      const response = await $got('http://github.com?test')
      assert.equal(response.statusCode, 200)
      assert(response.headers)
      assert.equal(response.headers['content-encoding'], 'gzip')
      assert(response.headers['x-mitm-valuable'])
      assert(response.body)
    })
  })

  describe('websocket', () => {
    it('should bypass', async () => {
      const websocket = new WebSocket('ws://echo.websocket.org', {agent})
      const message = Math.random().toString()
      await new Promise((resolve, reject) => {
        websocket.onmessage = (event) => {
          assert.equal(event.data, message)
          resolve()
        }
        websocket.onerror = reject
        websocket.onopen = () => {
          websocket.send(message)
        }
      })
    })
  })

  describe('https: links', () => {
    it('should be replace to http: (with compression)', async () => {
      const response = await $got('http://github.com')
      assert.equal(response.statusCode, 200)
      assert(response.headers)
      assert(response.headers['x-mitm-valuable'])
      assert(response.body)
      assert(!/["']\s*https:/.test(response.body))
    })
    it('should be replace to http: (no compression)', async () => {
      const response = await $got(
        'http://github.com',
        {
          headers: {'accept-encoding': ''}
        }
      )
      assert.equal(response.statusCode, 200)
      assert(response.headers)
      assert(response.headers['x-mitm-valuable'])
      assert(response.body)
      assert(!/["']\s*https:/.test(response.body))
    })
  })

  describe('search record', () => {
    it('should be be able to be searched', (resolve) => {
      elasticsearch.notification.once('done', async () => {
        const {index, type} = elasticsearch.options
        await elasticsearch.client.indices.refresh({index})
        const data = await elasticsearch.client.search(elasticsearch.options)
        assert(data.hits.total)
        resolve()
      })
      $got('http://github.com')
    })
  })

})
