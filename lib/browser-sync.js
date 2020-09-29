// using ngrok: https://gist.github.com/ahmadawais/a0509dd179ec511152c5

/*

    <% if (htmlWebpackPlugin.options.environment.InsertBrowserSync){ %>
      <script async id="__bs_script__" src="https://[[tunnelUrl]]/browser-sync/browser-sync-client.js?v=2.23.6"></script>
    <% } %>

*/

const browserSync = require('browser-sync')
const ngrok = require('ngrok')
const debounce = require('debounce')

const { promisify } = require('util')

const ngrokConnectAsync = promisify(ngrok.connect)

const defaultTunnelPort = 9094
const changeDebounceTime = 700

const changes = new Set()

let bs

async function startBrowserSyncAsync(tunnelPort = defaultTunnelPort) {
  const tunnelUrl = await ngrokConnectAsync(tunnelPort)

  bs = browserSync.create()

  bs.init({
    port: tunnelPort,
    host: tunnelUrl,
    cors: true,
    script: {
      domain: tunnelUrl
    },
    socket: {
      domain: tunnelUrl
    }
  })

  return { tunnelUrl, bs }
}

const reloadChanges = debounce(() => {
  bs.reload(Array.from(changes))
  changes.clear()
}, changeDebounceTime)

function resetChanges() {
  reloadChanges.clear()
  changes.clear()
}

function reload(file) {
  if (file) {
    changes.add(file)
  }
  reloadChanges()
}

module.exports = { startBrowserSyncAsync, reload, resetChanges }
