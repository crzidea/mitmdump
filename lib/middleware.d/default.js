const debug = require('debug')('mitmdump')

module.exports = async function() {

  const {proxy2client} = this
  //console.log(this.client2proxy.complete, this.client2proxy.readable);
  if (!this.client2proxy.readable) {
    return
  }

  //const target = `http://${this.options.host}`
  //debug(`bypass:${target}`)
  //this.proxy.web(this.client2proxy, this.proxy2client, {target})

  const server2proxy = await this.request()
  const {statusCode, headers} = server2proxy
  proxy2client.writeHead(statusCode, headers)
  server2proxy.pipe(proxy2client)
  server2proxy.resume()

}
