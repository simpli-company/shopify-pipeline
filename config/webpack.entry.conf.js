
const config = require('../config')

const pathResolver = require('../lib/path-resolver')
const commonExcludes = require('../lib/common-excludes')
const entrypoints = require('../lib/entrypoints')

const entry = Object.keys(entrypoints).reduce(
  (result, entryName) => {
    const entrypoint = entrypoints[entryName]
    let path

    if (entrypoint.lib) {
      path = pathResolver.resolveSelf(entrypoint.src)
    } else {
      path = pathResolver.resolveApp(entrypoint.src)
    }

    result[entryName] = path // eslint-disable-line no-param-reassign

    return result
  },
  {}
)

const excludes = new Set(
  Object.keys(entrypoints).reduce(
    (result, entryName) => {
      const entrypoint = entrypoints[entryName]
      const loader = entrypoint.loader || 'html'
      if (entrypoint.inject && loader === 'html') {
        result.push(...entrypoint.inject) // eslint-disable-line no-param-reassign
      }
      return result
    }, []
  )
)

const rawIncludes = [...excludes].map(
  relativePath => pathResolver.resolveApp(`src/${relativePath}`)
)

module.exports = {
  entry,
  module: {
    rules: [
      {
        test: config.regex.static,
        // excluding entrypoints files as they will be emitted by the HtmlWebpackPlugin
        exclude: commonExcludes(...excludes),
        loader: 'file-loader',
        options: {
          name: '../[path][name].[ext]'
        }
      },
      {
        test: /\.liquid$/,
        include: rawIncludes,
        loader: 'underscore-template-loader'
      }

    ]
  }
}
