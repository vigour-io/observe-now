'use strict'

exports.get = require('./get')
exports.update = require('api-promise')(
  'api.zeit.co',
  process.env.NOW_TOKEN,
  { 'Content-Type': 'application/json' }
)
exports.deployment = require('./deployment')
