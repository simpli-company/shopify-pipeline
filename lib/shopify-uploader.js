#!/usr/bin/env node
const chalk = require('chalk')
const path = require('path')
const themekit = require('@shopify/themekit').command
const watch = require('node-watch')
const EventEmitter = require('events')
const { TokenBucket } = require('limiter')
const md5 = require('md5')
const fs = require('fs')
const util = require('util')
const term = require('terminal-kit')
const dir = require('node-dir')
const jsonfile = require('jsonfile')
const config = require('../config')

const debuglog = util.debuglog('shopify-upload')

process.env.NODE_DEBUG = process.env.NODE_DEBUG || 'shopify-upload'

const recursiveIgnores = [
  '_',
  'node_modules'
]

const themekitSettings = {
  env: 'development',
  deployRoot: config.paths.dist,
  defaultArgs: [
    '--no-update-notifier',
    '--config', config.paths.userShopifyConfig,
    '--timeout', '30s'
  ],
  logLevel: 'silent'
}


const bucketSize = 70 // bucket size is 80, when I used 80 I got frequent errors. At 75 I got an error very rarely
const refillRate = 4
EventEmitter.defaultMaxListeners = bucketSize * 2 + 20
const bucket = new TokenBucket(bucketSize, refillRate, 'second')
bucket.content = bucket.bucketSize


const hashCache = {}

const status = {}

let errFactor = 2000

function actOnFile(file, action, cb, retries = 0) {
  status[file] = 'added'
  let retry = null
  if (retries > 0) {
    retry = () => {
      if (errFactor < 30000) {
        errFactor = 1.1 * errFactor
      }
      setTimeout(() => {
        console.log(chalk.yellow(`retrying ${file}...`))
        actOnFile(file, action, cb, retries - 1)
      }, errFactor + (Math.random() * 2000))
    }
  }
  bucket.removeTokens(1, () => {
    status[file] = 'started'
    themekit(
      {
        args: [
          action,
          '--env',
          themekitSettings.env,
          ...themekitSettings.defaultArgs,
          file
        ],
        logLevel: themekitSettings.logLevel,
        cwd: themekitSettings.deployRoot
      },
      (err) => {
        cb(err, file)
        if (err) {
          if (retry) {
            status[file] = 'retry'
            retry()
          } else {
            status[file] = `error: ${err}`
          }
        } else {
          status[file] = 'finished'
        }
      }
    )
  })
}

function uploadFile(file, cb, retries = 0) {
  actOnFile(file, 'upload', cb, retries)
}

function removeFile(file, cb, retries = 0) {
  actOnFile(file, 'remove', cb, retries)
}

function shouldIgnore(filePath) {
  const directories = filePath.split(path.sep)
  return recursiveIgnores.some(badDir => directories.includes(badDir))
}

module.exports = {
  upload(env) {
    themekitSettings.env = env
    const distDir = config.paths.dist


    // Leave in, for debugging
    // setInterval(() => {
    //   jsonfile.writeFile('/tmp/status.json', status, {spaces:2}, function(err){
    //     console.log(err);
    //   })
    // }, 20000)

    const handleResult = (err, file) => {
      if (err) {
        // console.log(chalk.red(`failed to upload ${file}: ${err}`))
        console.log(chalk.red(`failed to upload ${file}`))
      } else {
        console.log(chalk.green(`${file} ✔`))
      }
    }

    dir.promiseFiles(distDir)
      .then((files) => {
        files.forEach((filePath) => {
          if (shouldIgnore(filePath)) {
            console.log(chalk.yellow(`ignoring ${filePath}`))
          } else {
            const name = path.relative(distDir, filePath)
            uploadFile(name, handleResult, 5)
          }
        })

      // const filePath = files[10]
      // console.log(filePath)
      // const name = path.relative(distDir, filePath)
      // uploadFile(name, handleResult)
      })
      .catch(e => console.log(chalk.red(e)))
  },

  uploadChanges(cb, env) {
    themekitSettings.env = env
    const watchDir = config.paths.dist
    if (!fs.existsSync(watchDir)) {
      fs.mkdirSync(watchDir)
    }
    debuglog(chalk.green(`\n\nwatching ${watchDir} with bucketSize: ${bucketSize}, refillRate: ${refillRate}\n`))
    watch(watchDir, { recursive: true }, (evt, filePath) => {
      const name = path.relative(watchDir, filePath)

      const handleResult = (err, file) => {
        if (err) {
          console.log('') // need to ensure progress bars don't overwite errors
          console.log(chalk.red(`failed to upload ${file}`))
          console.log('')
        } else {
          console.log(chalk.green(`${file} ✔`))
          cb(file)
        }
      }

      if (evt === 'update') {
        fs.lstat(filePath, (err, stats) => {
          if (err) {
            return console.error(`${filePath}: ${err}`)
          }
          if (stats.isFile()) {
            if (shouldIgnore(filePath)) {
              console.log(chalk.yellow(`ignoring ${filePath}`))
            } else {
              fs.readFile(filePath, (err, buf) => {
                if (err) {
                  return console.error(`${filePath}: ${err}`)
                }
                const hash = md5(buf)
                if (hashCache[name] !== hash) {
                  uploadFile(name, handleResult, 5)
                  hashCache[name] = hash
                } else {
                  debuglog(chalk.black(`  (unchanged) ${name}`))
                }
              })
            }
          }
        })
      }

      if (evt === 'remove') {
        debuglog(chalk.cyan(`removing, ${name}`))
        removeFile(name, handleResult)
      }
    })
  }
}
