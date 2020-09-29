const fs = require('fs')

const path = require('path')

const appDirectory = fs.realpathSync(process.cwd())

/**
 * Resolve a relative path to the app directory
 *
 * @return String
 */
function resolveApp(relativePath) {
  return path.resolve(appDirectory, relativePath)
}

/**
 * Resolve a relative path to the tool directory
 *
 * @return String
 */
function resolveSelf(relativePath) {
  return path.resolve(__dirname, '../', relativePath)
}

module.exports = {
  appDirectory,
  resolveApp,
  resolveSelf
}
