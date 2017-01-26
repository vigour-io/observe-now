'use strict'

const { create } = require('brisky-struct')
const Now = require('now').default
const Alias = require('now/build/lib/alias').default

const now = require('../lib')

module.exports = (token) => {
  return create({
    props: {
      now: true,
      timeout: true,
      tryCount: true
    },
    define: {
      clearTimeout () {
        if (this.get('timeout')) {
          clearTimeout(this.get('timeout'))
        }
      },
      clearNow () {
        this.clearTimeout()
        if (this.get('now')) {
          this.get('now').close()
          this.set({ now: null })
        }
      },
      setNow () {
        this.clearNow()
        this.set({ now: new Now('https://api.zeit.co', token, {}) })
      },
      setAlias () {
        this.clearNow()
        this.set({ now: new Alias('https://api.zeit.co', token, {}) })
      },
      deploy (path, env) {
        this.setNow()

        const now = this.get('now')

        now.create(path, {
          env: Object.assign({
            NODE_ENV: 'production'
          }, env),
          forwardNpm: true,
          quiet: true
        })
          .then(() => {
            this.set({
              url: now.url,
              id: now.id
            })

            if (now.syncAmount) {
              now.upload()
              now.on('complete', this.complete.bind(this))
              now.on('error', this.emit.bind(this, 'error'))
            } else {
              this.complete()
            }
          })
          .catch(this.emit.bind(this, 'error'))

        return this
      },
      complete () {
        this.get('now').close()
        this.emit('deployed')

        this.set({ timeout: setTimeout(this.pollStatus.bind(this), 3000) })
      },
      pollStatus () {
        this.clearTimeout()

        const tryCount = this.get('tryCount')
        this.set({ tryCount: tryCount + 1 })

        if (tryCount > 11) {
          this.emit('error', `Long time, server not ready ${this.get('id').compute()}`)
          return this.kill()
        }

        now.get(`deployments/${this.get('id').compute()}`, token, false)
          .on('response', (deployment) => {
            if (deployment.state === 'READY') {
              return this.emit('ready')
            }

            this.set({ timeout: setTimeout(this.pollStatus.bind(this), 6000) })
          })
          .on('error', this.emit.bind(this, 'error'))
          .send()
      },
      load (deployment) {
        this.setAlias()
        this.get('now').findDeployment(deployment)
          .then(found => {
            this.set({
              url: found.url,
              id: found.uid
            })
            this.emit('loaded')
          })
          .catch(this.emit.bind(this, 'error'))

        return this
      },
      alias (domain) {
        this.setAlias()
        this.get('now').set(this.get('id').compute(), domain)
          .then(this.emit.bind(this, 'aliased'))
          .catch(this.emit.bind(this, 'error'))

        return this
      },
      kill () {
        this.setNow()
        this.get('now').remove(this.get('id').compute(), {hard: false})
          .then(this.emit.bind(this, 'killed'))
          .catch(this.emit.bind(this, 'error'))

        return this
      }
    },
    tryCount: 0,
    on (val, stamp, t) {
      if (val === null) {
        t.clearNow()
      }
    }
  })
}
