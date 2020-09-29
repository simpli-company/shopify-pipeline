
/* eslint-disable global-require, import/no-dynamic-require */
const fs = require('fs')
const chalk = require('chalk')
const config = require('../config')

function configForName(name) {
  const configPath = `${config.paths.root}/config/webpack.${name}.conf.js`
  if (fs.existsSync(configPath)) {
    console.log(chalk.yellow(`using config from ${configPath}`))
    return require(configPath)
  }
  return null
}

/**
 * Find and return the user webpack config or an empty object if none is found.
 *
 * @param   env   String  The environment
 * @return        Object
 */
function configForEnv(env) {
  if (!['dev', 'prod', 'watch'].includes(env)) {
    return [{}]
  }

  const configs = ['base', env].reduce(
    (list, confName) => {
      const userConf = configForName(confName)
      if (userConf) {
        return list.concat(userConf)
      }
      return list
    },
    []
  )

  return configs
}

module.exports = {
  configForEnv,
  configForName
}
