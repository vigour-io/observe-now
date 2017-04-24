'use strict'

const https = require('https')
const { create } = require('brisky-struct')
const JSONStream = require('JSONStream')

const dnsResolve = require('./dnsResolve')

module.exports = (path, token, pattern) => {
  return create({
    props: {
      abort: true
    },
    define: {
      send () {
        const self = this
        var abort = false

        dnsResolve()
          .then(apiIP => {
            const req = https.request({
              host: apiIP,
              port: 443,
              hostname: 'api.zeit.co',
              path: `/now/${path}`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })

            req.on('response', res => {
              stick(res, self, 'error')
              stick(res, self, 'end')

              const parser = res.pipe(JSONStream.parse(pattern))
              stick(parser, self, 'data', 'response')
              stick(parser, self, 'error')
            })

            stick(req, self, 'error')

            abort = req.abort.bind(req)

            req.end()
          })
          .catch(error => {
            self.emit('error', error)
          })

        self.set({ abort: () => { abort && abort() } })

        return self
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
