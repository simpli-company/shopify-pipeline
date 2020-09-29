module.exports = (...params) => new RegExp([
  'assets/vendors/',
  ...params
].join('|'))
