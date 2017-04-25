'use strict'

const test = require('tape')
const sinon = require('sinon')
const https = require('https')
const JSONStream = require('JSONStream')

const now = require('../lib')

test('now client - catch connection error', t => {
  t.plan(1)

  const request = sinon.stub(https, 'request')

  request
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

  now.get('deployments', 'API-TOKEN', 'deployments.*')
    .on('error', error => {
      t.equal(error, 'connection error', 'connection error caught')
      request.restore()
    })
    .send()
})

test('now client - get deployments list', t => {
  t.plan(2)

  const request = sinon.stub(https, 'request')
  const parse = sinon.stub(JSONStream, 'parse')

  request
    .returns({
      end: () => {},
      on: (e, cb) => {
        if (e === 'response') {
          return cb({
            on (e, cb) {
              if (e === 'end') {
                return setTimeout(cb, 0)
              }
            },
            pipe: parser => parser
          })
        }
      },
      abort: () => {}
    })

  parse
    .withArgs('deployments.*')
    .returns({
      on: (e, cb) => {
        if (e === 'end') {
          return setTimeout(cb, 0)
        } else if (e === 'data') {
          return setTimeout(cb, 0, {name: 'a'})
        }
      },
      write () {}
    })

  now.get('deployments', 'API-TOKEN', 'deployments.*')
    .on('response', dep => {
      t.equal(dep.constructor, Object, 'deployment is an object')
      t.equal(dep.name, 'a', 'deployment name is "a"')
    })
    .on('end', () => {
      request.restore()
      parse.restore()
    })
    .send()
})

test('now client - get package.json not a json', t => {
  t.plan(1)

  const request = sinon.stub(https, 'request')
  const parse = sinon.stub(JSONStream, 'parse')

  request
    .returns({
      end: () => {},
      on: (e, cb) => {
        if (e === 'response') {
          return cb({
            on: (e, cb) => {
            },
            pipe: parser => parser
          })
        }
      },
      abort: () => {}
    })

  parse
    .returns({
      on: (e, cb) => {
        if (e === 'end') {
          return setTimeout(cb, 0)
        } else if (e === 'error') {
          return setTimeout(cb, 0, { message: 'Invalid JSON foo bar' })
        }
      },
      write () {}
    })

  now.get('deployments', 'API-TOKEN')
    .on('error', err => {
      t.equal(/^Invalid JSON/.test(err.message), true, 'returns JSON Parse Error')
      request.restore()
      parse.restore()
    })
    .send()
})

test('now client - get package.json', t => {
  t.plan(5)

  const request = sinon.stub(https, 'request')
  const parse = sinon.stub(JSONStream, 'parse')

  request
    .onFirstCall()
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
            pipe: parser => parser
          })
        }
      },
      abort: () => {}
    })

  request
    .onSecondCall()
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
            pipe: parser => parser
          })
        }
      },
      abort: () => {}
    })

  parse
    .withArgs('files.*')
    .returns({
      on: (e, cb) => {
        if (e === 'end') {
          return setTimeout(cb, 0)
        } else if (e === 'data') {
          return setTimeout(cb, 0, { file: 'package.json', sha: 'pkg-uid' })
        }
      },
      write () {}
    })

  parse
    .withArgs(false)
    .returns({
      on: (e, cb) => {
        if (e === 'end') {
          return setTimeout(cb, 0)
        } else if (e === 'data') {
          return setTimeout(cb, 0, { version: '1.1.1' })
        }
      },
      write () {}
    })

  now.get('deployments/deployment-uid/links', 'API-TOKEN', 'files.*')
    .on('response', file => {
      t.equal(file.constructor, Object, 'file is an object')
      t.equal(file.file, 'package.json', 'file name is "package.json"')
      t.equal(file.sha, 'pkg-uid', 'file sha is "pkg-uid"')
    })
    .send()

  now.get('deployments/deployment-uid/files/pkg-uid', 'API-TOKEN', false)
    .on('response', pkg => {
      t.equal(pkg.constructor, Object, 'package.json is an object')
      t.equal(pkg.version, '1.1.1', 'version is 1.1.1')
    })
    .on('end', () => {
      request.restore()
      parse.restore()
    })
    .send()
})
