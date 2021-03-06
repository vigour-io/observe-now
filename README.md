# observe-now

[![Build Status](https://travis-ci.org/vigour-io/observe-now.svg?branch=master)](https://travis-ci.org/vigour-io/observe-now)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
[![npm version](https://badge.fury.io/js/observe-now.svg)](https://badge.fury.io/js/observe-now)
[![Coverage Status](https://coveralls.io/repos/github/vigour-io/observe-now/badge.svg?branch=master)](https://coveralls.io/github/vigour-io/observe-now?branch=master)

Observable based Now client.

## Installing

```bash
npm install observe-now --save
```

## Usage

Get is  a method with 3 parameters. Returns a `brisky-struct`.

```js
const observeNow = require('observe-now')

const request = observeNow.get('deployments', 'API-TOKEN', 'deployments.*')

request
  .on('response', deployment => {
    /* do something with deployment */
    if (deployment.uid === whatILookFor) {
      // stop this flow
      // emits 'end'
      request.abort()
    }
  })
  .on('error', err => {
    /* handle the error */
  })
  .on('end', () => {
    /* we got all deployments move on */
    request.set(null)
  })
  .send() // request won't be sent until we call this
```

Deployment is a method with a single parameter. Returns a `vigour-observable`.

You can deploy a new package and alias it on the fly:

```js
const observeNow = require('observe-now')

const deployment = observeNow.deployment('api-token')

deployment
  .deploy('directory', {env1: 'one', env2: 'two'})
  .on('deployed', () => {
    console.log('Deployed to now, waiting until ready...')
  })
  .on('ready', () => {
    console.log('Deployment ready, aliasing...')
    deployment.alias('some-domain.com')
  })
  .on('aliased', () => {
    console.log('Alias successful!')
    deployment.set(null)
  })
  .on('error', error => {
    console.error('Deployment failed due to error: %j, stack: %s', error, error ? error.stack : '(no stack)')
  })
```

Or you can load an existing deployment and alias it:

```js
deployment
  .load('https://your-deployment-url.now.sh')
  .on('loaded', () => {
    console.log('Deployment loaded!')
    deployment.alias('some-domain.com')
  })
  .on('aliased', () => {
    console.log('Alias successful!')
    deployment.set(null)
  })
  .on('error', error => {
    console.error('Alias failed due to error: %j, stack: %s', error, error ? error.stack : '(no stack)')
  })
```

You can also remove any deployment any time you need:

```js
const observeNow = require('observe-now')

const deployment = observeNow.deployment('api-token')

deployment
  .deploy('directory', {env1: 'one', env2: 'two'})
  .on('deployed', () => {
    console.log('Deployed to now, waiting until ready...')
  })
  .on('ready', () => {
    console.log('Deployment ready, removing...')
    deployment.kill()
  })
  .on('killed', () => {
    console.log('Kill successful!')
    deployment.set(null)
  })
  .on('error', error => {
    console.error('Deployment failed due to error: %j, stack: %s', error, error ? error.stack : '(no stack)')
  })
```
