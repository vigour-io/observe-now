'use strict'

const { create } = require('brisky-struct')
const Now = require('now/build/lib')
const Alias = require('now/build/lib/alias')

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
        const self = this
        self.setNow()

        Promise.all(
          Object.keys(env)
            .filter(key => env[key][0] === '@')
            .map(key => new Promise((resolve, reject) => {
              const name = env[key].substr(1)

              now.get('secrets', token, 'secrets.*')
                .on('response', (secret) => {
                  if (secret.name === name) {
                    resolve(env[key] = { uid: secret.uid })
                  }
                })
                .on('error', reject.bind(null, new Error(`Could not find secret ${name}`)))
                .on('end', reject.bind(null, new Error(`Could not find secret ${name}`)))
                .send()
            }))
        )
          .then(() => self.get('now').create(path, {
            env: Object.assign({ NODE_ENV: 'production' }, env),
            forwardNpm: true,
            quiet: true
          }))
          .then(() => {
            self.set({
              url: self.get('now').url,
              id: self.get('now').id
            })

            if (self.get('now').syncAmount) {
              self.get('now').upload()
              self.get('now').on('complete', self.complete.bind(self))
              self.get('now').on('error', self.emit.bind(self, 'error'))
            } else {
              self.complete()
            }
          })
          .catch(self.emit.bind(self, 'error'))

        return self
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

        if (tryCount > 21) {
          this.emit('error', `Long time, server not ready ${this.get('id').compute()}`)
          return this.kill()
        }

        now.get(`deployments/${this.get('id').compute()}`, token, false)
          .on('response', (deployment) => {
            if (deployment.state === 'READY') {
              return this.emit('ready')
            }

            this.set({ timeout: setTimeout(this.pollStatus.bind(this), 1e4) })
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
