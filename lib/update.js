'use strict'

const https = require('https')

module.exports = (method, path, body) => new Promise((resolve, reject) => {
  https.request({
    hostname: 'api.zeit.co',
    method,
    path: `/now/${path}`,
    port: 443,
    headers: {
      'Authorization': `Bearer ${process.env.NOW_TOKEN}`,
      'Content-Type': 'application/json'
    }
  })
    .on('response', res => {
      var data = ''

      res.on('error', reject)
      res.on('data', chunk => {
        data += chunk
      })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          resolve(data)
        }
      })
    })
    .on('error', reject)
    .end(body && JSON.stringify(body))
})
