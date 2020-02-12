import Vue from 'vue'
import Step1 from './Step1.vue'

Vue.config.productionTip = false

new Vue({
  render: h => h(Step1)
}).$mount('#app')


/**
 * This demo is going to be hosted in iframe and needs to be responsive
 * the map size is 960x600 so the resolution is 600/960 = 0.625
 */
const handleResize = () => {
  const width = window.innerWidth
  const height = window.innerWidth * 0.625
  try {
    window.parent.postMessage({
      'event-type': 'iframe-content-resize',
      width, 
      height
    },
    document.location.origin)
  } catch (e) {
    // nothing to do here
  }
}
handleResize()
window.addEventListener('resize', handleResize)
