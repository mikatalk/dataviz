module.exports = {
  baseUrl: process.env.NODE_ENV === 'production'
    ? 'https://mikatalk.github.io/dataviz/'
    : '//0.0.0.0:64700/',
  devServer: {
    port: 64700,
    // because of webgl context and memory leaks
    // we refresh the page each time
    hot: false
  }
}