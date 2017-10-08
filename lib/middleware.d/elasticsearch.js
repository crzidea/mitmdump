const elasticsearch = require('elasticsearch')
const dateFormat = require('dateformat');
const debug = require('debug')('mitmdump')

const options = {}
options.host      = process.env.ELASTICSEARCH_HOST || 'localhost:9200'
options.httpAuth  = process.env.ELASTICSEARCH_AUTH || 'elastic:changeme'
debug(`elasticsearch: ${options.host}`)

const client = new elasticsearch.Client(options)
let index = _index()
const type = 'dump'

function _index() {
  const now = new Date()
  return `mitm-${dateFormat(now, 'yyyymmddHHMMss')}`
}

setInterval(() => {
  index = _index()
}, 60000)

const EventEmitter = require('events').EventEmitter
const notification = new EventEmitter

module.exports = async function() {
  if (!this.record) {
    return
  }
  function normalizeHeaders(message) {
    message.headers = Object.keys(message.headers)
      .map((name) => ({name, value: message.headers[name]}))
  }
  normalizeHeaders(this.record.request);
  for (const response of this.record.responses) {
    normalizeHeaders(response)
  }
  await client.index({ index, type, body: this.record })
  notification.emit('done')
}

// for test purpose
module.exports.client = client
module.exports.options = {index, type}
module.exports.notification = notification
