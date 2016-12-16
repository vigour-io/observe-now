'use strict'

const https = require('https')
const Observable = require('vigour-observable')
const JSONStream = require('JSONStream')

module.exports = (path, token, pattern) => {
  return new Observable({
    properties: {
      req: true,
      abort: true
    },
    define: {
      send () {
        this.req = https.request({
          hostname: 'api.zeit.co',
          path: `/now/${path}`,
          port: 443,
          method: 'GET',
          headers: {
            'Authorization': `Bearer: ${token}`
          }
        })

        this.req.on('response', res => {
          stick(res, this, 'error')

          const parser = res.pipe(JSONStream.parse(pattern))
          stick(parser, this, 'data')
          stick(parser, this, 'error')
          stick(parser, this, 'end')
        })

        stick(this.req, this, 'error')
        this.abort = this.req.abort.bind(this.req)

        this.req.end()

        return this
      }
    },
    on: {
      remove () {
        delete this.req
        delete this.abort
      }
    }
  })
}

function stick (source, target, event) {
  source.on(event, target.emit.bind(target, event))
}
