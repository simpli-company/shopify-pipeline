/*
 * Run Webpack with the webpack.prod.conf.js configuration file. Write files to disk.
 *
 * If the `deploy` argument has been passed, deploy to Shopify when the compilation is done.
 */
const argv = require('minimist')(process.argv.slice(2), {
  'boolean': 'minify',
  'boolean': 'inc'
})

process.env.watch = true

const webpack = require('webpack')
const webpackConfigPromise = require('../config/webpack.watch.conf')
const uploader = require('../lib/shopify-uploader')
const browserSync = require('../lib/browser-sync')

const config = require('../config')
const env = require('../lib/get-shopify-env-or-die')(argv.env, config.shopify)
const WebpackOnBuildPlugin = require('on-build-webpack')

process.env.SHOPIFY_ENV = env

const util = require('util')
// const debuglog = util.debuglog('shopify-upload')
// debuglog('webpack-config:\n %o', webpackConfig)

let browserSyncServer
let uploaderStarted = false

const onBuildUpload = new WebpackOnBuildPlugin(() => {
  if (argv.inc && !uploaderStarted) {
    uploader.uploadChanges(file => browserSyncServer && browserSyncServer.reload(file), env)
    uploaderStarted = true
  }
})

function startWatching() {
  webpackConfigPromise.then((resolvedConfig) => {
    resolvedConfig.plugins.push(onBuildUpload)
    if (argv['browser-sync']) {
      const FlushBrowserSyncPlugin = function () {}
      FlushBrowserSyncPlugin.prototype.apply = (compiler) => {
        compiler.plugin('watch-run', (watching, cb) => {
          browserSync.resetChanges()
          cb()
        })
      }
      resolvedConfig.plugins.push(new FlushBrowserSyncPlugin())
    }
    webpack(resolvedConfig, (err, stats) => {
      if (err) throw err

      process.stdout.write(`${stats.toString({
        colors: true,
        modules: false,
        children: false,
        chunks: false,
        chunkModules: false
      })}`)
    })
  })
}


if (!argv.inc) {
  uploader.uploadChanges(() => {}, env)
}

if (argv['browser-sync']) {
  browserSync.startBrowserSyncAsync().then(({ tunnelUrl, bs }) => {
    browserSyncServer = bs
    argv['browser-sync-tunnel-url'] = tunnelUrl
    startWatching()
  })
} else {
  startWatching()
}

