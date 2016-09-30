'use strict'

const Observable = require('vigour-observable')
const Now = require('now').default
const Alias = require('now/build/lib/alias').default

const get = require('./get')

module.exports = (path, env, token) => {
  return new Observable({
    properties: {
      now: true,
      timeout: true,
      tryCount: true
    },
    define: {
      clearTimeout () {
        if (this.timeout) {
          clearTimeout(this.timeout)
        }
      },
      clearNow () {
        this.clearTimeout()
        if (this.now) {
          this.now.close()
          delete this.now
        }
      },
      setNow () {
        this.clearNow()
        this.now = new Now('https://api.zeit.co', token, {})
      },
      setAlias () {
        this.clearNow()
        this.now = new Alias('https://api.zeit.co', token, {})
      },
      deploy () {
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

        this.timeout = setTimeout(this.pollStatus.bind(this), 5000)
      },
      pollStatus () {
        this.clearTimeout()

        if (++this.tryCount > 10) {
          this.emit('error', `Long time, server not ready ${this.id.compute()}`)
          return this.kill()
        }

        get(`deployments/${this.id.compute()}`, token, false)
          .on('data', (deployment) => {
            if (deployment.state === 'READY') {
              return this.emit('ready')
            }

            this.timeout = setTimeout(this.pollStatus.bind(this), this.tryCount * 1500)
          })
          .on('error', this.emit.bind(this, 'error'))
          .send()
      },
      alias (domain) {
        this.setAlias()
        this.now.set(this.id.compute(), domain)
          .then(this.emit.bind(this, 'aliased'))
          .catch(this.emit.bind(this, 'error'))

        return this
      },
      kill () {
        this.setNow()
        this.now.remove(this.id.compute(), {hard: false})
          .then(this.emit.bind(this, 'killed'))
          .catch(this.emit.bind(this, 'error'))

        return this
      }
    },
    tryCount: 0,
    on: {
      remove () {
        this.clearNow()
      }
    }
  })
}
