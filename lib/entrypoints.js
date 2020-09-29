const merge = require('webpack-merge')
const config = require('../config')
const userConfigs = require('./get-user-webpack-config')

const userEntryConfig = userConfigs.configForName('entry') || {}

module.exports = merge.smart(
  config.paths.entrypoints,
  userEntryConfig.entrypoints || {}
)
