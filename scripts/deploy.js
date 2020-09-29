/*
 * Run Webpack with the webpack.prod.conf.js configuration file. Write files to disk.
 *
 * If the `deploy` argument has been passed, deploy to Shopify when the compilation is done.
 */
const argv = require('minimist')(process.argv.slice(2))
const chalk = require('chalk')
const webpack = require('webpack')
const prodConfig = require('../config/webpack.prod.conf')
const watchConfig = require('../config/webpack.watch.conf')
const webpackConfig = argv.watch ? watchConfig : prodConfig

const config = require('../config')
const shopify = require('../lib/shopify-deploy')
const env = require('../lib/get-shopify-env-or-die')(argv.env, config.shopify)

shopify.overwrite(env).then(() => {
  console.log(chalk.green('\nFiles overwritten successfully!\n'))
}).catch((error) => {
  console.log(`\n${chalk.red(error)}\n`)
})
