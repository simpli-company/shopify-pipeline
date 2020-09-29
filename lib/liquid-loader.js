const utils = require('loader-utils')
const chalk = require('chalk')

const escapeStringRegexp = require('escape-string-regexp')

/**
 * Liquid loader
 *
 * Parses liquid files, searching for assets that are piped to `asset_url` and
 * transforming them into `require()` call so that images are run through the
 * correct loader and their name are fingerprinted.
 *
 * You should most likely use this along with the `extract-loader`, which will
 * extract the required images and prepare the output for the file-loader.
 *
 * By default (dev-server: false), this loader will keep keep the liquid template.
 * You can however pass `dev-server: true` to completely remove the liquid template
 * so that the assets are served from the local dev-server.
 */
let uniqueKey = 0
const getUniqueKey = () => {
  uniqueKey += 1
  return uniqueKey
}

module.exports = function liquidLoader(content) {
  // let debug = false
  // if (content.includes('thisisthedealoftheday')) {
  //   debug = true
  //   console.log('\n\n\n')
  //   console.log(chalk.red('------> liquid loader for deal of the day <------------'))
  //   console.log(content)
  //   console.log('\n\n\n')
  // }
  // if (content.includes('thisislayouttheme')) {
  //   debug = true
  //   console.log('\n\n\n')
  //   console.log(chalk.red('------> liquid loader for layout/theme.liquid <------------'))
  //   console.log(content)
  //   console.log('\n\n\n')
  // }
  // make this loader cacheable, unless it's dependencies have changed, given
  // an input X, it will always produce the same result.
  this.cacheable()

  const replacements = {/* key: path */}

  const defaultOptions = { 'dev-server': false }
  const userOptions = utils.getOptions(this) || {}
  const options = Object.assign({}, defaultOptions, userOptions)

  // Assume that quoted asset_* are not variables, but actual assets.
  // Match anything after `asset_`, until `}}`
  // ie.: will match asset_url, asset_image_url: '300px', ...
  const regex = /{{ '(.*)' \| asset_([^}}]*)}}/g

  // Replace each file with a unique key, to be converted to require() later.
  const keyedContent = content.replace(regex, (liquidExpr, file) => {
    const key = `__LIQUID_LOADER_${getUniqueKey()}__`

    // We're on a dev server, replace the whole liquid expression
    if (options['dev-server']) {
      replacements[key] = file
      return key
    }

    const fileRegex = new RegExp(escapeStringRegexp(file))

    // Replace only the filename, keeping the liquid expression
    return liquidExpr.replace(fileRegex, (match) => {
      replacements[key] = match
      return key
    })
  })

  const llRegex = /__LIQUID_LOADER_\d+__/g

  // Replace keys with a call to require(), correctly escaped
  const parsed = JSON.stringify(keyedContent).replace(llRegex, (match) => {
    const request = utils.urlToRequest(replacements[match])
    const path = utils.stringifyRequest(this, request)

    // Ensure loader cache is busted when the image changes
    this.addDependency(path)

    // Double quotes are used to "escape" from the JSON.stringify()'ed content
    return `" + require(${path}) +"`
  })

  const output = `module.exports = ${parsed};`

  // if (debug) {
  //   console.log('parsed:')
  //   console.log(parsed)
  // }
  return output
}
