const debug = require('debug')('mitmdump')

module.exports = async function() {

  const {proxy2client} = this
  if (this.client2proxy.complete) {
    return
  }

  debug('pipe everythinig')

  //const target = `http://${this.options.host}${this.options.path}`
  //proxy.web(this.client2proxy, this.proxy2client, {target})

  const server2proxy = await this.request()
  const {statusCode, headers} = server2proxy
  proxy2client.writeHead(statusCode, headers)
  server2proxy.pipe(proxy2client)
  server2proxy.resume()

  return

}
