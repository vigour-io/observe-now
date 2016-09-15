# ploy-observe-now
<!-- VDOC.badges travis; standard; npm; coveralls -->
<!-- DON'T EDIT THIS SECTION (including comments), INSTEAD RE-RUN `vdoc` TO UPDATE -->
[![Build Status](https://travis-ci.org/vigour-io/ploy-observe-now.svg?branch=master)](https://travis-ci.org/vigour-io/ploy-observe-now)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
[![npm version](https://badge.fury.io/js/ploy-observe-now.svg)](https://badge.fury.io/js/ploy-observe-now)
[![Coverage Status](https://coveralls.io/repos/github/vigour-io/ploy-observe-now/badge.svg?branch=master)](https://coveralls.io/github/vigour-io/ploy-observe-now?branch=master)
<!-- VDOC END -->

GET only Now API client, streams the results as events.

## Installing

```bash
npm install ploy-observe-now --save
```

## Usage

It's a single method with 3 parameters. Returns a vigour-observable.

```js
const observeNow = require('ploy-observe-now')

const request = observeNow('deployments', 'API-TOKEN', 'deployments.*')

request
  .on('data', deployment => {
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
    /* you got all deployments move on */
  })
  .send()
```
