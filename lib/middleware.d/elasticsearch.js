const elasticsearch = require('elasticsearch')
const dateFormat = require('dateformat');
const debug = require('debug')('mitmdump')

const options = {}
options.host      = process.env.ELASTICSEARCH_HOST || 'localhost:9200'
options.httpAuth  = process.env.ELASTICSEARCH_AUTH || 'elastic:changeme'
debug(`elasticsearch: ${options.host}`)

const client = new elasticsearch.Client(options)

const $options = { index: $index(), type: 'dump' }

function $index(date) {
  date = date || new Date()
  return `mitm-${dateFormat(date, 'yyyymmddHH')}`
}

const EventEmitter = require('events').EventEmitter
const notification = new EventEmitter

module.exports = async function() {
  if (!this.dump) {
    return
  }
  function normalizeHeaders(message) {
    message.headers = Object.keys(message.headers)
      .map((name) => ({name, value: message.headers[name]}))
  }
  normalizeHeaders(this.dump.request);
  for (const response of this.dump.responses) {
    normalizeHeaders(response)
  }
  const now = this.dump.date = new Date
  $options.index = $index(now)
  await client.index(Object.assign({ body: this.dump }, $options))
  notification.emit('done')
}

// for test purpose
module.exports.client = client
module.exports.options = $options
module.exports.notification = notification
