import {useCallback, useEffect, useRef} from 'react'

export const useWebSocket = (
  callback: (ws: WebSocket) => void,
  url: string,
  running = true
): void => {
  const wsRef = useRef<WebSocket>()

  const startListening = useCallback(() => {
    wsRef.current = new WebSocket(url)
    callback(wsRef.current)
  }, [callback, url])

  useEffect(() => {
    if (running) {
      startListening()
      return () => wsRef.current?.close?.()
    }
  }, [startListening, running])

  useEffect(() => {
    // reconnect a broken WS connection
    const checker = setInterval(() => {
      if (
        running &&
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.CLOSING ||
          wsRef.current.readyState === WebSocket.CLOSED)
      ) {
        startListening()
      }
    }, 2000)
    return () => clearInterval(checker)
  }, [startListening, running])
}

export const useRafOnce = (callback: () => void): (() => void) => {
  const handleRef = useRef(-1)

  return useCallback(() => {
    cancelAnimationFrame(handleRef.current)
    handleRef.current = requestAnimationFrame(callback)
  }, [callback])
}
