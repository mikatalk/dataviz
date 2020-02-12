<template>
  <svg
    ref="map-svg"
    class="map-svg"
    viewBox="0 0 960 600"
    preserveAspectRatio="xMidYMid meet"></svg>
</template>


<script>

import * as d3 from "d3";
import * as topojson from 'topojson'
import us from '@/data/us-10m.v1.json'

export default {
  name: 'Step1',
  data: () => ({
    scale: 1.345,
    
    counties: [],
    // inactivityTimeout: 10000,
    canvasWidth: 960,
    canvasHeight: 600,
    mouse: {
      x:0,
      y:0
    },
    lastMouse: {
      x:-1,
      y:-1
    },
    currentCounty: null
  }),
  mounted () {
    // this.gatherData()
    this.createD3Map()
    // const blocks = this.runTexturePacker()
    // this.counties.push(...blocks)
    // this.drawCounties()
    // this.createWebGLMap()
  },
  methods: {
    createD3Map () {
      const svg = d3.select(this.$refs['map-svg'])
      const path = d3.geoPath()
      svg.append('g')
          .attr('class', 'counties')
        .selectAll('path')
        .data(topojson.feature(us, us.objects.counties).features)
        .enter().append('path')
          .attr('id', e => e.id)
          .attr('d', path)
    }
  }
}
</script>

<style lang="scss">
body {
  margin: 0;
  overflow: hidden;
}
.map-svg {
  width: 100%;
  height: auto;
  path {
    cursor: pointer;
    fill: rgba(255,255,255,0.0);
    stroke: black;
    stroke-width: 0.2px;
    transition: fill ease 300ms;
    &:hover {
      transition: fill ease 20ms;
      fill: rgba(25,25,25,0.3);
    }
  }
}
</style>