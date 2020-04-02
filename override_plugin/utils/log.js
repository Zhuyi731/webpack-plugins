const path = require('path')
const fs = require('fs')
const logDest = path.join(__dirname, '../../override.log.js')

module.exports = {
  logToFile (msg) {
    if (typeof msg === 'object') {
      msg = JSON.stringify(msg, null, '\t')
    }
    fs.appendFileSync(logDest, `${msg}\n`, 'utf-8')
  }
}
