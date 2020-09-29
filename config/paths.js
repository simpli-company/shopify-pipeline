const fs = require('fs')
const bourbon = require('node-bourbon').includePaths
const pathResolver = require('../lib/path-resolver')

/**
 * Find and return the userland .eslintrc if one exists, otherwise, returns
 * shopify-pipeline .eslintrc.
 *
 * @return  String  Path to an .eslintrc file
 */
function getEslintrc() {
  const appEslintrc = pathResolver.resolveApp('./.eslintrc')

  if (fs.existsSync(appEslintrc)) {
    return appEslintrc
  }

  return pathResolver.resolveSelf('./.eslintrc')
}

module.exports = {
  root: pathResolver.appDirectory,
  dist: pathResolver.resolveApp('dist'),
  src: pathResolver.resolveApp('src'),
  vendors: pathResolver.resolveApp('src/assets/vendors'),
  lib: pathResolver.resolveSelf('lib'),
  entrypoints: {
    index: {
      src: 'src/assets/js/index.js'
    },
    checkout: {
      inject: ['layout/checkout.liquid'],
      src: 'src/assets/js/checkout.js'
    },
    static: {
      src: 'lib/static-files-glob.js',
      lib: true,
      inject: false
    }
  },
  assetsOutput: pathResolver.resolveApp('dist/assets'),
  userShopifyConfig: pathResolver.resolveApp('config/shopify.yml'),
  userServerConfig: pathResolver.resolveApp('config/server.yml'),
  eslintrc: getEslintrc(),
  bourbon
}
