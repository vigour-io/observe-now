'use strict'

exports.get = require('./get')
exports.update = require('api-promise')('api.zeit.co', process.env.NOW_TOKEN)
exports.deployment = require('./deployment')
