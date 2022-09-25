const expressWs = require('express-ws')

const PING_INTERVAL = 10000
let wss = undefined

/**
 * AddWebSockets enables web sockets on the express application and
 * automatically closes broken web sockets.
 *
 * @param {*} app express application
 */
function addWebSockets(app) {
  wss = expressWs(app).getWss()
  wss.on('connection', function connection(client) {
    client.isAlive = true
    client.on('pong', () => (client.isAlive = true))
  })

  const interval = setInterval(function ping() {
    wss.clients.forEach(function each(client) {
      if (client.isAlive === false) return client.terminate()

      client.isAlive = false
      if (client.readyState === 1 /* WebSocket.OPEN */) {
        client.ping()
      }
    })
  }, PING_INTERVAL)

  wss.on('close', function close() {
    clearInterval(interval)
  })
}

function forEachWebSocket(callback) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === 1 /* WebSocket.OPEN */) {
      callback(client)
    }
  })
}

module.exports = {
  addWebSockets,
  forEachWebSocket,
}
