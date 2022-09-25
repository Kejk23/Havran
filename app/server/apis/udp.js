const dgram = require('dgram')
const {UDP_PORT} = require('../env')

function initUdp() {
  if (!UDP_PORT) return

  const socket = dgram.createSocket('udp4')

  socket.on('listening', () => {
    let addr = socket.address()
    console.log(`Discover service running at ${addr.address}:${addr.port}`)
  })

  socket.on('error', (err) => {
    console.error(`UDP error: ${err.stack}`)
  })

  socket.on('message', (msg, info) => {
    const str = msg.toString()
    if (str !== 'IOT_CENTER_URL_REQUEST') return
    console.log(`Discover request from ${info.address}`)
    socket.send('IOT_CENTER_URL_RESPONSE', info.port, info.address)
  })

  socket.bind(UDP_PORT)
}

module.exports = {
  initUdp,
}
