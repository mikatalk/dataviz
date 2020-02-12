module.exports = {
  publicPath: process.env.NODE_ENV === 'production'
    ? '/article-assets/make-a-webgl-powered-us-counties-map-with-d3-and-three-js/dist/'
    : '/',
  devServer: {
    port: 6789,
    // because of webgl context and memory leaks
    // we refresh the page each time
    hot: false
  },
  filenameHashing: false,
  pages: {
    'index': 'src/main.js',
    'step-1': 'src/step-1.js',
    'step-2': 'src/step-2.js'
  }
}