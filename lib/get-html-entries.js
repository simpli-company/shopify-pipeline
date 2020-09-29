const HtmlWebpackPlugin = require('html-webpack-plugin')
const merge = require('webpack-merge')

const entrypoints = require('../lib/entrypoints')


const universalChunks = ['manifest', 'vendor']

module.exports = opts => Object.keys(entrypoints).reduce(
  (result, entryName) => {
    const entrypoint = entrypoints[entryName]
    const chunks = universalChunks.concat(entryName)
    const loader = entrypoint.loader || 'html'
    if (entrypoint.inject && loader === 'html') {
      entrypoint.inject.forEach((filename) => {
        const htmlWebpackOpts = merge(
          opts,
          {
            chunks,
            filename: `../${filename}`,
            template: `./${filename}`,
            inject: true
          },
          entrypoint.options
        )
        const htmlEntry = new HtmlWebpackPlugin(htmlWebpackOpts)
        result.push(htmlEntry)
      })
    }
    return result
  }, []
)
