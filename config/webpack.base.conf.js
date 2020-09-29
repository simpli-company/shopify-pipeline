const fs = require('fs')
const webpack = require('webpack')
const WriteFileWebpackPlugin = require('write-file-webpack-plugin')
const InlineChunkWebpackPlugin = require('html-webpack-inline-chunk-plugin')

const LodashModuleReplacementPlugin = require('lodash-webpack-plugin')
const GitRevisionPlugin = require('git-revision-webpack-plugin')
const SvgStore = require('webpack-svgstore-plugin')
const merge = require('webpack-merge')

const chalk = require('chalk')

const config = require('../config')
const paths = require('../config/paths')
const entryConfig = require('./webpack.entry.conf')
const commonExcludes = require('../lib/common-excludes')

const isDevServer = process.argv.find(v => v.includes('serve'))

/**
 * Return an array of ContextReplacementPlugin to use.
 * Omit the __appvendors__ replacement if the directory does not exists.
 *
 * @see https://webpack.js.org/plugins/context-replacement-plugin/#newcontentcallback
 */
const contextReplacementPlugins = () => {
  // Given a request path, return a function that accepts a context and modify it's request.
  const replaceCtxRequest = request => context => Object.assign(context, { request })

  const plugins = [
    new webpack.ContextReplacementPlugin(/__appsrc__/, replaceCtxRequest(paths.src))
  ]

  if (fs.existsSync(paths.vendors)) {
    return [
      ...plugins,
      new webpack.ContextReplacementPlugin(/__appvendors__/, replaceCtxRequest(paths.vendors))
    ]
  }

  return plugins
}


module.exports = merge.smart(entryConfig, {
  context: paths.src,

  output: {
    filename: '[name].[hash].js',
    path: config.paths.assetsOutput
  },

  resolve: {
    symlinks: false
  },

  resolveLoader: {
    modules: [config.paths.lib, 'node_modules']
  },

  module: {
    rules: [
      {
        test: /fancybox[\/\\]/,
        use: 'imports-loader?jQuery=jquery,$=jquery,this=>window'
      },
      {
        test: /\.js$/,
        exclude: commonExcludes(),
        include: paths.src,
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: ['lodash'],
              presets: [
                ['env', {
                  targets: {
                    browsers: ['last 2 versions', 'safari >= 7']
                  },
                  modules: false
                }]
              ]
            }
          }
        ]
      },
      {
        test: /fonts\/.*\.(eot|svg|ttf|woff|woff2)$/,
        loader: 'file-loader'
      },
      {
        test: config.regex.images,
        exclude: commonExcludes(),
        use: [
          { loader: 'file-loader', options: { name: '[name].[hash].[ext]' } },
          { loader: 'img-loader' }
        ]
      },
      {
        test: /assets\/vendors\//,
        exclude: /node_modules/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]'
        }
      },
      {
        test: /\.liquid$/,
        exclude: commonExcludes(),
        loader: `extract-loader!liquid-loader?dev-server=${isDevServer ? 'true' : 'false'}`
      }
    ]
  },

  externals: {
    jquery: 'jQuery'
  },

  plugins: [
    ...contextReplacementPlugins(),


    new WriteFileWebpackPlugin({
      test: /\.(png|svg|jpg|gif|scss)/,
      useHashIndex: true,
      log: false
    }),

    new WriteFileWebpackPlugin({
      test: /^(?:(?!hot-update.json$).)*\.(liquid|json)$/,
      useHashIndex: true,
      log: false
    }),

    new SvgStore({
      svgoOptions: {
        plugins: [
          { removeTitle: true }
        ]
      }
    }),

    new webpack.ProvidePlugin({
      jQuery: 'jquery',
      $: 'jquery',
      jquery: 'jquery'
    }),

    new LodashModuleReplacementPlugin(),

    new GitRevisionPlugin({
      branch: true
    })

  ]
})
