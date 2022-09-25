const WebSocketClient = require('websocket').client // eslint-disable-line node/no-unpublished-require

const client = new WebSocketClient()

client.on('connectFailed', function (error) {
  console.log('Connect Error: ' + error.toString())
})

client.on('connect', function (connection) {
  console.log('WebSocket Client Connected')
  connection.on('error', function (error) {
    console.log('Connection Error: ' + error.toString())
  })
  connection.on('close', function () {
    console.log('Connection Closed')
  })
  connection.on('message', function (message) {
    if (message.type === 'utf8') {
      console.log("Received: '" + message.utf8Data + "'")
    }
  })
  connection.sendUTF(
    'subscribe:' + JSON.stringify([{measurement: 'environment', tags: []}])
  )
})

const port = process.env.SERVER_PORT || 5000
client.connect(`ws://localhost:${port}/mqtt`)
