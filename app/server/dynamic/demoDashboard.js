const path = require('path')
const fs = require('fs')

/**
 * @return {Promise<{type: "dashboard" | "svg", data: "string", key: "string"}[]>}
 */
const loadDemoDashoards = async () => {
  const demoFiles = await new Promise((resolve, reject) => {
    fs.readdir(path.join(__dirname, './demo/'), (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })

  const demoPaths = demoFiles.map((x) => path.join(__dirname, './demo/', x))

  const loadRes = await Promise.all(
    demoPaths.map(
      (p) =>
        new Promise((resolve, reject) => {
          fs.readFile(p, (e, data) => {
            if (e) reject(e)
            else resolve([p, data ? data.toString('utf-8') : undefined])
          })
        })
    )
  )

  return loadRes
    .map(([p, data]) => {
      if (!data) return
      const filename = path.basename(p)
      const extSep = filename.lastIndexOf('.')
      const key = filename.substring(0, extSep)
      const extension = filename.substring(extSep + 1).toLowerCase()
      if (extension === 'svg' || extension === 'json')
        return {type: extension === 'svg' ? 'svg' : 'dashboard', data, key}
      else
        console.warn(
          `invalid extension of ${p} expected svg or json as demo dashboards`
        )
    })
    .filter((x) => x)
}

module.exports = {
  loadDemoDashoards,
}
