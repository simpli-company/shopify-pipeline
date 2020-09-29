/**
 * Launch an HTTPS Express server with webpack dev and hot middleware.
 *
 * After successful compilation, uploads modified files (written to disk) to Shopify.
 */
const argv = require('minimist')(process.argv.slice(2))
const chalk = require('chalk')
const createHash = require('crypto').createHash
const express = require('express')
const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const webpack = require('webpack')
const webpackDevMiddleware = require('webpack-dev-middleware')
const webpackHotMiddleware = require('webpack-hot-middleware')
const openBrowser = require('react-dev-utils/openBrowser')
const clearConsole = require('react-dev-utils/clearConsole')
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages')

const config = require('../config')
const webpackConfig = require('../config/webpack.dev.conf')
const shopify = require('../lib/shopify-deploy')
const env = require('../lib/get-shopify-env-or-die')(argv.env, config.shopify)

const fakeCert = fs.readFileSync(path.join(__dirname, '../ssl/server.pem'))
const sslOptions = {
  key: fakeCert,
  cert: fakeCert
}

const app = express()
const server = config.serveHttps ? https.createServer(sslOptions, app) : http.createServer(app)
const compiler = webpack(webpackConfig)

const shopifyUrl = `https://${config.shopify[env].store}`
const previewUrl = `${shopifyUrl}?preview_theme_id=${config.shopify[env].theme_id}`

let isFirstCompilation = true

const assetsHash = {}

/**
 * Return an array of changed files that have been written to the file system.
 * Uses the same method as write-file-webpack-plugin to determine which files
 * have changed.
 * @see https://github.com/gajus/write-file-webpack-plugin/blob/master/src/index.js#L134-L145
 *
 * @param   assets  Object   Assets obejct from webpack stats.compilation object
 * @return          Array
 */
function getFilesFromAssets(assets) {
  let files = []

  Object.keys(assets).forEach((key) => {
    const asset = assets[key]

    if (asset.emitted && fs.existsSync(asset.existsAt)) {
      const source = asset.source()
      const assetSource = Array.isArray(source) ? source.join('\n') : source
      const assetHash = createHash('sha256').update(assetSource).digest('hex')

      // new file, or existing one that changed
      if (!assetsHash[key] || assetsHash[key] !== assetHash) {
        files = [...files, asset.existsAt.replace(config.paths.dist, '')]
        assetsHash[key] = assetHash
      }
    }
  })

  return files
}

app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  next()
})

app.use(webpackDevMiddleware(compiler, {
  quiet: true,
  reload: false
}))

const hotMiddleware = webpackHotMiddleware(compiler)
app.use(hotMiddleware)

compiler.plugin('invalid', () => {
  clearConsole()
  console.log('Compiling...')
})

compiler.plugin('done', (stats) => {
  clearConsole()

  // webpack messages massaging and logging gracioulsy provided by create-react-app.
  const messages = formatWebpackMessages(stats.toJson({}, true))

  if (messages.errors.length) {
    console.log(chalk.red('Failed to compile.\n'))
    messages.errors.forEach((message) => {
      console.log(`${message}\n`)
    })
    // If errors exist, only show errors.
    return
  }

  if (messages.warnings.length) {
    console.log(chalk.yellow('Compiled with warnings.\n'))
    messages.warnings.forEach((message) => {
      console.log(`${message}\n`)
    })
    // Teach some ESLint tricks.
    console.log('You may use special comments to disable some warnings.')
    console.log(`Use ${chalk.yellow('// eslint-disable-next-line')} to ignore the next line.`)
    console.log(`Use ${chalk.yellow('/* eslint-disable */')} to ignore all warnings in a file.`)
  }

  if (!messages.errors.length && !messages.warnings.length) {
    console.log(chalk.green('Compiled successfully!'))
    console.log('\nThe app is running at:\n')
    console.log(`  ${chalk.cyan(previewUrl)}`)
    console.log('\nHMR is running at:\n')
    console.log(`  ${chalk.cyan(config.devDomain)}`)
  }

  // files we'll upload
  const files = getFilesFromAssets(stats.compilation.assets)

  if (!files.length) {
    return
  }

  console.log(chalk.cyan('\nUploading files to Shopify...\n'))
  files.forEach((file) => {
    console.log(`\t${file}`)
  })
  console.log('\n')

  shopify.sync(env, files).then(() => {
    console.log(chalk.green('\nFiles uploaded successfully!\n'))

    if (isFirstCompilation) {
      isFirstCompilation = false
      openBrowser(previewUrl)
    }

    // Notify the HMR client that we finished uploading files to Shopify
    hotMiddleware.publish({
      action: 'shopify_upload_finished',
      // don't force a reload if only theme.liquid has been updated, has it get's
      // updated even when we change scritps/styles
      force: !(files.length === 1 && files[0] === '/layout/theme.liquid')
    })
  }).catch((err) => {
    console.log(chalk.red(err))
  })
})

server.listen(config.port)
