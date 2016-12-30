'use strict'

const https = require('https')
const { create } = require('brisky-struct')
const JSONStream = require('JSONStream')

module.exports = (path, token, pattern) => {
  return create({
    props: {
      abort: true
    },
    define: {
      send () {
        const req = https.request({
          hostname: 'api.zeit.co',
          path: `/now/${path}`,
          port: 443,
          method: 'GET',
          headers: {
            'Authorization': `Bearer: ${token}`
          }
        })

        req.on('response', res => {
          stick(res, this, 'error')
          stick(res, this, 'end')

          const parser = res.pipe(JSONStream.parse(pattern))
          stick(parser, this, 'data', 'response')
          stick(parser, this, 'error')
        })

        stick(req, this, 'error')

        this.set({ abort: req.abort.bind(req) })

        req.end()

        return this
      }
    }
  })
}

function stick (source, target, event, tevent) {
  if (!tevent) {
    tevent = event
  }
  source.on(event, target.emit.bind(target, tevent))
}
