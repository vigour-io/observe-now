'use strict'

const test = require('tape')
const sinon = require('sinon')
const https = require('https')

const now = require('../lib/index')

const httpsRequestOptions = {
  hostname: 'api.zeit.co',
  port: 443,
  method: 'GET',
  headers: {
    'Authorization': 'Bearer: API-TOKEN'
  }
}

test('now client - catch connection error', t => {
  t.plan(1)

  const request = sinon.stub(https, 'request')

  request
    .withArgs(Object.assign({
      path: '/now/deployments'
    }, httpsRequestOptions))
    .returns({
      end: () => {},
      on: (e, cb) => {
        if (e === 'error') {
          return setTimeout(cb, 0, 'connection error')
        }
        if (e === 'response') {
          return cb({
            on: (e, cb) => {},
            pipe: (parser) => parser
          })
        }
      },
      abort: () => {}
    })

  now('deployments', 'API-TOKEN', 'deployments.*')
    .on('error', error => {
      t.equal(error, 'connection error', 'connection error caught')
      request.restore()
    })
    .send()
})

test('now client - get deployments list', t => {
  t.plan(2)

  const request = sinon.stub(https, 'request')

  request
    .withArgs(Object.assign({
      path: '/now/deployments'
    }, httpsRequestOptions))
    .returns({
      end: () => {},
      on: (e, cb) => {
        if (e === 'response') {
          return cb({
            on: (e, cb) => {
              if (e === 'end') {
                return setTimeout(cb, 0)
              }
            },
            pipe: (parser) => {
              setTimeout(parser.write.bind(parser), 0, '{"deployments":[{"name":"a"}]}')
              return parser
            }
          })
        }
      },
      abort: () => {}
    })

  now('deployments', 'API-TOKEN', 'deployments.*')
    .on('data', dep => {
      t.equal(dep.constructor, Object, 'deployment is an object')
      t.equal(dep.name, 'a', 'deployment name is "a"')
    })
    .on('end', () => {
      request.restore()
    })
    .send()
})

test('now client - get package.json not a json', t => {
  t.plan(1)

  const request = sinon.stub(https, 'request')

  request
    .withArgs(Object.assign({
      path: '/now/deployments'
    }, httpsRequestOptions))
    .returns({
      end: () => {},
      on: (e, cb) => {
        if (e === 'response') {
          return cb({
            on: (e, cb) => {
            },
            pipe: (parser) => {
              setTimeout(parser.write.bind(parser), 0, 'not a json')
              return parser
            }
          })
        }
      },
      abort: () => {}
    })

  now('deployments', 'API-TOKEN')
    .on('error', err => {
      t.equal(/^Invalid JSON/.test(err.message), true, 'returns JSON Parse Error')
      request.restore()
    })
    .send()
})

test('now client - get package.json', t => {
  t.plan(5)

  const request = sinon.stub(https, 'request')

  request
    .withArgs(Object.assign({
      path: '/now/deployments/deployment-uid/links'
    }, httpsRequestOptions))
    .returns({
      end: () => {},
      on: (e, cb) => {
        if (e === 'response') {
          return cb({
            on: (e, cb) => {
              if (e === 'end') {
                return setTimeout(cb, 0)
              }
            },
            pipe: (parser) => {
              setTimeout(parser.write.bind(parser), 0, '{"files": [{"file": "package.json", "sha": "pkg-uid"}]}')
              return parser
            }
          })
        }
      },
      abort: () => {}
    })

  request
    .withArgs(Object.assign({
      path: '/now/deployments/deployment-uid/files/pkg-uid'
    }, httpsRequestOptions))
    .returns({
      end: () => {},
      on: (e, cb) => {
        if (e === 'response') {
          return cb({
            on: (e, cb) => {
              if (e === 'end') {
                return setTimeout(cb, 0)
              }
            },
            pipe: (parser) => {
              setTimeout(parser.write.bind(parser), 0, '{"version": "1.1.1"}')
              return parser
            }
          })
        }
      },
      abort: () => {}
    })

  now('deployments/deployment-uid/links', 'API-TOKEN', 'files.*')
    .on('data', file => {
      t.equal(file.constructor, Object, 'file is an object')
      t.equal(file.file, 'package.json', 'file name is "package.json"')
      t.equal(file.sha, 'pkg-uid', 'file sha is "pkg-uid"')
    })
    .send()

  now('deployments/deployment-uid/files/pkg-uid', 'API-TOKEN', false)
    .on('data', pkg => {
      t.equal(pkg.constructor, Object, 'package.json is an object')
      t.equal(pkg.version, '1.1.1', 'version is 1.1.1')
    })
    .on('end', () => {
      request.restore()
    })
    .send()
})
