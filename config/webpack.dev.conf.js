const path = require('path')
const webpack = require('webpack')
const merge = require('webpack-merge')

const config = require('./index')
const webpackConfig = require('./webpack.base.conf')
const commonExcludes = require('../lib/common-excludes')
const userConfigs = require('../lib/get-user-webpack-config')
const getHtmlEntries = require('../lib/get-html-entries')

// so that everything is absolute
webpackConfig.output.publicPath = `${config.devDomain}/`

// add hot-reload related code to entry chunks
Object.keys(webpackConfig.entry).forEach((name) => {
  webpackConfig.entry[name] = [
    path.join(__dirname, '../lib/hot-client.js')
  ].concat(webpackConfig.entry[name])
})

const userWebpackConfig = userConfigs.configForEnv('dev')

const htmlEntries = getHtmlEntries({})

module.exports = merge.smart(webpackConfig, {
  devtool: 'eval-source-map',

  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.js$/,
        include: config.paths.src,
        exclude: commonExcludes('/node_modules/'),
        loader: 'eslint-loader',
        options: {
          configFile: config.paths.eslintrc
        }
      },
      {
        test: /\.s?[ac]ss$/,
        exclude: commonExcludes(),
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader', options: { sourceMap: true } },
          { loader: 'sass-loader', options: { sourceMap: true, includePaths: [].concat(config.paths.bourbon) } }
        ]
      },
      {
        test: /\.js$/,
        exclude: commonExcludes(),
        loader: 'hmr-alamo-loader'
      }
    ]
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
      BUILD_MODE: JSON.stringify('serve')
    }),

    new webpack.HotModuleReplacementPlugin(),

    new webpack.NoEmitOnErrorsPlugin(),

    ...htmlEntries

  ]
}, ...userWebpackConfig)
