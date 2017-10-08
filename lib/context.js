const url = require('url')
const http = require('http')
const middlewares = require('./middleware.js')

module.exports = class Context {
  constructor(client2proxy, proxy2client) {
    this.client2proxy = client2proxy
    this.proxy2client = proxy2client

    const headers = Object.keys(client2proxy.headers)
    .filter(key => !/^proxy-/.test(key))
    .reduce((headers, key) => {
      headers[key] = client2proxy.headers[key]
      return headers
    }, Object.create(null))
    const {method} = client2proxy
    const {path} = url.parse(client2proxy.url)
    const [host, port] = client2proxy.headers.host.split(':')
    headers.host = host
    this.options = { method, path, host, headers }
  }

  async execute() {
    for (const middleware of middlewares) {
      const next = await middleware.call(this)
      if (!next) {
        break
      }
    }
  }

  async request(protocol = http, body) {
    if (!body) {
      body = this.client2proxy
      body.resume()
    }
    return new Promise((resolve, reject) => {
      const proxy2server = protocol.request(this.options, (response) => {
        response.pause()
        resolve(response)
      })
      body.pipe(proxy2server)
    })
  }

}
