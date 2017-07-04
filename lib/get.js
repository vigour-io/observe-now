'use strict'

const dns = require('dns')
const https = require('https')
const { create } = require('brisky-struct')
const JSONStream = require('JSONStream')

const dnsCache = {}

const lookup = (host, opts, cb) => {
  if (!cb) {
    cb = opts
  }
  if (dnsCache[host]) {
    cb(null, dnsCache[host])
  } else {
    dns.lookup(host, opts, (err, address) => {
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

module.exports = (path, token, pattern) => create({
  props: {
    abort: true
  },
  define: {
    send () {
      const req = https.request({
        hostname: 'api.zeit.co',
        path: `/now/${path}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        lookup
      })

      req.on('response', res => {
        stick(res, this, 'error')
        stick(res, this, 'end')

        const parser = res.pipe(JSONStream.parse(pattern))
        stick(parser, this, 'data', 'response')
        stick(parser, this, 'error')
      })

      this.set({ abort: req.abort.bind(req) })

      stick(req, this, 'error')

      req.end()

      return this
    }
  }
})

function stick (source, target, event, tevent) {
  if (!tevent) {
    tevent = event
  }
  source.on(event, target.emit.bind(target, tevent))
}
