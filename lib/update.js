'use strict'

const https = require('https')

const dnsResolve = require('./dnsResolve')

module.exports = (method, path, body) => dnsResolve()
  .then(apiIP => new Promise((resolve, reject) => {
    https.request({
      protocol: 'https:',
      host: apiIP,
      hostname: 'api.zeit.co',
      method,
      path: `/now/${path}`,
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
  }))
