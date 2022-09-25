import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import envCompatible from 'vite-plugin-env-compatible'
import svgLoader from '@honkhonk/vite-plugin-svgr'

const SERVER_PORT = process.env.SERVER_PORT || 5000

export default defineConfig({
  plugins: [
    react({fastRefresh: process.env.NODE_ENV !== 'test'}),
    svgLoader(),
    envCompatible({prefix: 'REACT_APP'}),
  ],
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
  resolve: {
    alias: {
      '~antd': require('path').resolve(__dirname, '..', 'node_modules', 'antd'),
    },
  },
  server: {
    port: process.env.PORT ? Number.parseInt(process.env.PORT) : 3000,
    proxy: {
      '/api': {
        target: `http://localhost:${SERVER_PORT}`,
        changeOrigin: true,
      },
      '/influx': {
        target: `http://localhost:${SERVER_PORT}`,
        changeOrigin: true,
      },
      '/mqtt': {
        target: `http://localhost:${SERVER_PORT}`,
        changeOrigin: true,
      },
      '/kafka': {
        target: `http://localhost:${SERVER_PORT}`,
        changeOrigin: true,
      },
    },
    host: true
  },
})
