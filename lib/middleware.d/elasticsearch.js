const elasticsearch = require('elasticsearch')

const options = {}
options.host = 'http://localhost:9200'
options.httpAuth = 'elastic:changeme'

const client = new elasticsearch.Client(options)
const index = 'mitm.default'
const type = 'dump'

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
