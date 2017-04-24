'use strict'

const dns = require('dns')

const apiHost = 'api.zeit.co'
var apiIP = false

module.exports = () => new Promise((resolve, reject) => {
  if (apiIP) {
    resolve(apiIP)
  } else {
    dns.lookup(apiHost, { hints: dns.ADDRCONFIG }, (err, address, family) => {
      if (err) {
        reject(err)
      } else {
        apiIP = address
        setTimeout(() => { apiIP = false }, 1e4)
        resolve(apiIP)
      }
    })
  }
})
