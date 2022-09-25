/**
 * Parses protocol lines into array of points having measurement, tagPairs, fields, timestamp fields
 * @param {string|Buffer} data input data
 * @returns arrays of points
 */
function parseProtocolLines(data) {
  if (typeof data !== 'string') data = String(data)
  const result = []
  let start = 0
  let i = start

  // TODO the implementation does not expect escaped characters,
  // it is assumed that no special charaters (\ ,") are used.
  //
  // https://docs.influxdata.com/influxdb/v1.8/write_protocols/line_protocol_reference/#special-characters

  while (i < data.length) {
    let measurement
    const tagPairs = []
    const fields = {}
    let timestamp

    // read measurement
    for (; i < data.length; i++) {
      const c = data[i]
      if (c === '\n') {
        start++
        continue
      }
      if (c === ' ' || c === ',') {
        measurement = data.substring(start, i)
        break
      }
    }
    // read tag key=value pairs
    if (data[i] === ',') {
      start = ++i
      readTags: for (; i < data.length; i++) {
        switch (data[i]) {
          case ',':
            tagPairs.push(data.substring(start, i))
            start = i + 1
            continue
          case ' ':
            tagPairs.push(data.substring(start, i))
            break readTags
        }
      }
    }
    // read field key=value pairs
    if (data[i] === ' ') {
      start = ++i
      let key
      readField: for (; i < data.length; i++) {
        switch (data[i]) {
          case '=':
            key = data.substring(start, i)
            start = i + 1
            continue
          case ',':
            fields[key] = toJsValue(data.substring(start, i))
            start = i + 1
            continue
          case ' ':
            fields[key] = toJsValue(data.substring(start, i))
            break readField
        }
      }
    }
    // read timestamp
    if (data[i] === ' ') {
      start = i + 1
      while (i < data.length && data[i] !== '\n') i++
      timestamp = data.substring(start, i)
    }
    start = i
    result.push({
      measurement,
      tagPairs,
      fields,
      timestamp,
    })
  }
  return result
}

/**
 * Converts line protocol value to JavaScript value.
 * @param {string} line protocol field value
 */
function toJsValue(val) {
  if (val === 'true') {
    return true
  }
  if (val === 'false') {
    return false
  }
  if (val.startsWith('"')) {
    return val.substring(1, val.length > 1 ? val.length - 1 : 1)
  }
  if (val.endsWith('i') || val.endsWith('u')) {
    val = val.substring(0, val.length - 1)
  }
  return Number.parseFloat(val)
}

module.exports = parseProtocolLines
