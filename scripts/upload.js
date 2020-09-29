/**

Upload dist to shopify, using the parallel uploader

*/

const argv = require('minimist')(process.argv.slice(2))
const chalk = require('chalk')

const uploader = require('../lib/shopify-uploader')

const config = require('../config')
const env = require('../lib/get-shopify-env-or-die')(argv.env, config.shopify)

uploader.upload(env)