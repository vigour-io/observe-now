'use strict'

const test = require('tape')
const sinon = require('sinon')
const Now = require('now/build/lib')
const Alias = require('now/build/lib/alias')

const now = require('../lib')

process.env.NOW_TOKEN = 'NOW-TOKEN'

test('deploy - alias', t => {
  const create = sinon.stub(Now.prototype, 'create')
  const set = sinon.stub(Alias.prototype, 'set')
  const get = sinon.stub(now, 'get')

  Now.prototype._id = 'deployment-id'
  Now.prototype._host = 'deployment-url.now.sh'
  Now.prototype._syncAmount = 0
  Now.prototype._missing = []

  create
    .withArgs('directory', {
      env: {
        NODE_ENV: 'production',
        env1: 'val1',
        env2: { uid: 'secret-uid' }
      },
      forwardNpm: true,
      quiet: true
    })
    .returns(Promise.resolve())

  get
    .withArgs('secrets', 'NOW-TOKEN', 'secrets.*')
    .returns({
      on (e, cb) {
        if (e === 'response') {
          setTimeout(cb, 0, { name: 'secret', uid: 'secret-uid' })
        }
        return this
      },
      send () {}
    })

  get
    .withArgs('deployments/deployment-id', 'NOW-TOKEN', false)
    .returns({
      on (e, cb) {
        if (e === 'response') {
          setTimeout(cb, 0, { state: 'READY' })
        }
        return this
      },
      send () {}
    })

  set
    .withArgs('deployment-id', 'some-domain.com')
    .returns(Promise.resolve())

  t.plan(4)

  const deployment = now.deployment(process.env.NOW_TOKEN)

  deployment
    .deploy('directory', { env1: 'val1', env2: '@secret' })
    .on('deployed', () => {
      t.equals(deployment.id.compute(), 'deployment-id', 'has deployment id')
      t.equals(deployment.url.compute(), 'https://deployment-url.now.sh', 'has deployment url')
    })
    .on('ready', () => {
      t.ok(true, 'ready')
      deployment.alias('some-domain.com')
    })
    .on('aliased', () => {
      t.ok(true, 'aliased')
      deployment.set(null)
      create.restore()
      set.restore()
      get.restore()
    })
    .on('error', error => {
      console.error('Deployment failed due to error: %j, stack: %s', error, error ? error.stack : '(no stack)')
    })
})

test('load - alias', t => {
  const findDeployment = sinon.stub(Alias.prototype, 'findDeployment')
  const set = sinon.stub(Alias.prototype, 'set')

  findDeployment
    .withArgs('https://deployment-url.now.sh')
    .returns(Promise.resolve({ uid: 'deployment-id', url: 'https://deployment-url.now.sh' }))

  set
    .withArgs('deployment-id', 'some-domain.com')
    .returns(Promise.resolve())

  t.plan(2)

  const deployment = now.deployment(process.env.NOW_TOKEN)

  deployment
    .load('https://deployment-url.now.sh')
    .on('loaded', () => {
      t.ok(true, 'loaded')
      deployment.alias('some-domain.com')
    })
    .on('aliased', () => {
      t.ok(true, 'aliased')
      deployment.set(null)
      findDeployment.restore()
      set.restore()
    })
    .on('error', error => {
      console.error('Alias failed due to error: %j, stack: %s', error, error ? error.stack : '(no stack)')
    })
})
