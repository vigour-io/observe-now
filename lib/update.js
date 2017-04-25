'use strict'

const dns = require('dns')
const https = require('https')

const dnsCache = {}

const lookup = (host, cb) => {
  if (dnsCache[host]) {
    cb(null, dnsCache[host])
  } else {
    dns.lookup(host, { hints: dns.ADDRCONFIG }, (err, address) => {
      if (err) {
        cb(err)
      } else {
        dnsCache[host] = address
        setTimeout(() => { delete dnsCache[host] }, 3e4)
        cb(null, dnsCache[host])
      }
    })
  }
}

module.exports = (method, path, body) => new Promise((resolve, reject) => {
  https.request({
    hostname: 'api.zeit.co',
    method,
    path: `/now/${path}`,
    headers: {
      'Authorization': `Bearer ${process.env.NOW_TOKEN}`,
      'Content-Type': 'application/json'
    },
    lookup
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
