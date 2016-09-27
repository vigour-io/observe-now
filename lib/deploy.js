'use strict'

const Observable = require('vigour-observable')
const Now = require('now').default

const get = require('./get')

module.exports = (path, env) => {
  return new Observable({
    properties: {
      now: true,
      timeout: true,
      tryCount: true
    },
    define: {
      setNow () {
        this.clearTimeout()
        if (this.now) {
          delete this.now
        }
        this.now = new Now('https://api.zeit.co', process.env.NOW_TOKEN, {})
      },
      deploy() {
        this.setNow()

        this.now.create(path, {
          env: Object.assign({
            NODE_ENV: 'production'
          }, env),
          forwardNpm: true,
          quiet: true
        })
          .then(() => {
            this.set({
              url: this.now.url,
              id: this.now.id
            })

            if (this.now.syncAmount) {
              this.now.upload()
              this.now.on('complete', this.complete.bind(this))
              this.now.on('error', this.emit.bind(this, 'error'))
            } else {
              this.complete()
            }
          })
          .catch(this.emit.bind(this, 'error'))

        return this
      },
      complete () {
        this.now.close()
        this.emit('deployed')

        this.timeout = setTimeout(this.pollStatus.bind(this), 4000)
      },
      pollStatus () {
        this.clearTimeout()

        if (++this.tryCount > 10) {
          this.emit('error', `Long time, server not ready ${this.id.compute()}`)
          return this.kill()
        }

        get(`deployments/${this.id.compute()}`, process.env.NOW_TOKEN, false)
          .on('data', (deployment) => {
            if (deployment.state === 'READY') {
              return this.emit('ready')
            }

            this.timeout = setTimeout(this.pollStatus.bind(this), this.tryCount * 1000)
          })
          .on('error', this.emit.bind(this, 'error'))
          .send()
      },
      kill () {
        this.setNow()
        this.now.remove(this.id.compute(), {hard: false})
          .then(this.emit.bind(this, 'killed'))
          .catch(this.emit.bind(this, 'error'))

        return this
      },
      clearTimeout () {
        if (this.timeout) {
          clearTimeout(this.timeout)
        }
      }
    },
    tryCount: 0,
    on: {
      remove () {
        this.clearTimeout()

        if (this.now) {
          this.now.close()
          delete this.now
        }
      }
    }
  })
}
