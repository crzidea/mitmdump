const middlewares = []

push('./middleware.d/http2https.js')
//push('./middleware.d/elasticsearch.js')
push('./middleware.d/default.js')

function push(module) {
  middlewares.push(require(module))
}

module.exports = middlewares
