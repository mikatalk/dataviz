import Vue from 'vue'
import Router from 'vue-router'
import MapUS from './views/MapUS.vue'

Vue.use(Router)

export default new Router({
  // mode: 'history',
  routes: [
    {
      path: '/',
      name: 'home',
      component: MapUS
    },
    {
      path: '/nyt',
      name: 'NYT map',
      component: () => import(/* webpackChunkName: "map-nyt" */ './views/MapNYT.vue')
    }
  ]
})
