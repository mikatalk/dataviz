<template>
  <div class="map-us">

    <h1>US Counties</h1>
    <h4>Gather map data</h4>
     <p>Following <a href="https://bl.ocks.org/mbostock/4136647">this D3 example</a>,
    Create a SVG map of {{counties.length.toLocaleString()}} US counties.</p>
    <svg
      ref="map-svg"
      class="map-svg"
      viewBox="0 0 960 600"
      preserveAspectRatio="xMidYMid meet"></svg>

    <hr/>

    <h4>Export Counties One by One</h4>
    <p> Next use <em>getBBox()</em> to get each county bounds</p>
    <br/>
    <svg
      @click="randomize"
      ref="test-svg"
      class="test-svg"
      preserveAspectRatio="xMidYMid meet"></svg>
    <br/>
    <em>Click on the SVG to randomize the state</em>

    <hr/>

    <h4>Draw to Canvas</h4>
    <p>Redraw All {{counties.length.toLocaleString()}} US Counties onto a Canvas, using their coordinates</p>
    
    <canvas
      class="counties-canvas"
      ref="counties-canvas"
      />

    <hr/>
 
    <h4>Pack onto Canvas for Texture</h4>
    <p>Redraw All {{counties.length.toLocaleString()}} US Counties onto a Canvas, using their packed positions</p>
   
    <canvas
      class="packed-counties-canvas"
      ref="packed-counties-canvas"
      />

    <hr/>

    <h4>Upload to the GPU</h4>
    <p>Each county is mapped to an instanced 3d plane geometry with the right uv map.</p>
    <h4 class="county-label">County of {{currentCounty}}</h4>
    <canvas
      class="counties-webgl-canvas"
      ref="counties-webgl-canvas"
      />

  </div>
</template>

<script>

import * as d3 from "d3";
import * as topojson from 'topojson'
import names from '@/data/county-names.json'
import us from '@/data/us-10m.v1.json'
import GrowingPacker from '@/utils/GrowingPacker'
import * as THREE from 'three'
const OrbitControls = require('three-orbit-controls')(THREE)

export default {
  name: 'home',
  data: () => ({
    scale: 1.345,
        vertexShader: `
      precision highp float;

      uniform float sineTime;

      uniform float time;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;

      attribute vec2 uv;
      varying vec2 vUv;

      attribute float ratio;
      varying float vRatio;
      attribute float countyIndex;
      attribute vec4 countyTag;
      attribute vec3 position;
      attribute vec3 offset;
      attribute vec4 color;
      attribute vec4 orientationStart;
      attribute vec4 orientationEnd;
      attribute vec2 uvOffsets;
      attribute vec2 uvScales;
      varying vec4 vCountyTag;

      void main(){
        vCountyTag = countyTag;
        vec3 pos = position * vec3(uvScales.xy * 1024.0, 1.0);
        pos = pos + offset;
        
        vUv = vec2(uv.x, 1.0-uv.y);
        vUv *= uvScales;
        vUv = vec2(vUv.x, 1.0-vUv.y);
        vUv += vec2(uvOffsets.x , uvOffsets.y);

        vRatio = ratio;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float time;
      uniform sampler2D map;
      uniform float isPicking;
      varying vec2 vUv;
      varying float vRatio;
      varying vec4 vCountyTag;

      void main() {
        vec2 uv = vUv;
        vec4 color = texture2D(map, uv);
        if (color.x + color.y + color.z < 0.9) {
          discard;
        }
        if (isPicking == 1.0) {
          gl_FragColor = vCountyTag;
        } else {
          color.r = 1.0 - vRatio * 0.7;
          color.g = 0.5 - vRatio * 0.2;
          color.b = vRatio * 0.9;
          gl_FragColor = color;
        }
      }
    `,
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
    this.gatherData()
    this.createD3Map()
    const blocks = this.runTexturePacker()
    this.counties.push(...blocks)
    this.drawCounties()
    this.createWebGLMap()
  },
  methods: {
    gatherData () {
      
      // ).then(({d3:default}) => {
      // d3.csv('public/CtyxCty_US.csv').then(data => {
      //   console.log('--', data)
      // })
      // })
    },
    randomize () {
      const paths = this.$refs['map-svg'].querySelectorAll('g.counties path')
      const index = Math.round(Math.random() * paths.length) % paths.length
      const box = paths[index].getBBox()
      this.$refs['test-svg'].setAttribute('width', box.width)
      this.$refs['test-svg'].setAttribute('height', box.height)
      this.$refs['test-svg'].setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`)
      this.$refs['test-svg'].append(paths[index].cloneNode(true))
    },
    createD3Map () {
      console.log({topojson, us})
      const svg = d3.select(this.$refs['map-svg'])
      const path = d3.geoPath()
      svg.append('g')
          .attr('class', 'counties')
        .selectAll('path')
        .data(topojson.feature(us, us.objects.counties).features)
        .enter().append('path')
          .attr('id', e => e.id)
          .attr('d', path)
      this.randomize()
    },
    runTexturePacker () {
      const blocks = [...this.$refs['map-svg'].querySelectorAll('g.counties path')]
        .map(path => {
          const { x, y, width, height } = path.getBBox()
          return {
            id: parseInt(path.getAttribute('id')),
            x: x * this.scale,
            y: y * this.scale,
            w: width * this.scale,
            h: height * this.scale,
            path
          }
        })
        .sort((a, b) => (Math.min(b.w, b.h) - Math.min(a.w, a.h)))

      const packer = new GrowingPacker()
      packer.fit(blocks)
      return blocks
    },
    drawCounties () {
      const canvas = this.$refs['counties-canvas']
      canvas.width = 960
      canvas.height = 600
      const context = canvas.getContext('2d')
      context.strokeStyle = '#000'
      context.lineWidth = 0
      context.fillStyle = '#000'

      const canvasPacked = this.$refs['packed-counties-canvas']
      canvasPacked.width = 1024
      canvasPacked.height = 1024
      const contextPacked = canvasPacked.getContext('2d')
      contextPacked.strokeStyle = 'transparent'
      contextPacked.lineWidth = 0
      contextPacked.fillStyle = 'transparent'
      contextPacked.rect(0,0, canvasPacked.width, canvasPacked.height)
      contextPacked.stroke()
      contextPacked.fill()
      contextPacked.fillStyle = 'white'

      let i = 0
      for(let block of this.counties) {
        if (block.fit) {

          const path = new Path2D(block.path.getAttribute('d'))

          context.fillStyle = `hsl(${360 * Math.random()}, 50%, 50%)`
          context.stroke(path)
          context.fill(path)
          context.restore()

          contextPacked.save()
          // contextPacked.fillStyle = `hsl(${360 * Math.random()}, 50%, 50%)`
          contextPacked.translate(-block.x, -block.y)
          contextPacked.translate(block.fit.x, block.fit.y)
          contextPacked.scale(this.scale, this.scale)
          contextPacked.stroke(path)
          contextPacked.fill(path)

          contextPacked.restore()

        } else {
          // eslint-disable-next-line
          console.warn(`Error packing county at ${i}`)
        }
        i++
      }
      
    },
    createWebGLMap () {
      var camera, scene, renderer, controls, mouseIsDown = false
      // var pickingData, pickingRenderTarget, pickingScene
      var clock = new THREE.Clock()
      var mesh
      const RESET_VALUE = 0.5
      var pickingRenderTarget
      // var pickingScene
      // var highlightBox
      var pixelBuffer = new Uint8Array(4)
      var canvas = this.$refs['counties-webgl-canvas']
      const init = () => {
        renderer = new THREE.WebGLRenderer({
          canvas: canvas,
          antialias: true,
          alpha: true
        })
        renderer.setPixelRatio( window.devicePixelRatio )
        renderer.setSize( this.canvasWidth, this.canvasHeight )
        if ( renderer.extensions.get( 'ANGLE_instanced_arrays' ) === null ) {
          alert("This experiment is not supoprted by your browser.")
          return
        }
        // camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 100000 );
        camera = new THREE.PerspectiveCamera( 50, this.canvasWidth / this.canvasHeight, 1, 100000 );
        camera.position.z = 1000

        scene = new THREE.Scene()

        controls = new OrbitControls(camera)
        // controls = new OrbitControls(camera, renderer.domElement)
        controls.enableKeys = true
        controls.enableZoom = false
        controls.maxPolarAngle = Math.PI / 2
        // geometry
        document.addEventListener('keydown', e => {
          if (e.key == '=') {
            camera.position.z -= 50
            render(clock.getDelta())
          } else if (e.key == '-') {
            camera.position.z += 50
            render(clock.getDelta())
          }
        })

        pickingRenderTarget = new THREE.WebGLRenderTarget(
          this.canvasWidth, this.canvasHeight
        )

        var instances = this.counties.length
        var ratios = []
        var countyIndexes = []
        var countyTags = []
        var offsets = []
        var uvOffsets = []
        var uvScales = []
        for (let i = 0, l = this.counties.length; i < l; i++) {
          const block = this.counties[i]
        
          ratios.push(RESET_VALUE)

          countyIndexes.push(i)

          countyTags.push(
            ( (i+1) >> 16 & 255 ) / 255,
            ( (i+1) >> 8 & 255 ) / 255,
            ( (i+1) >> 0 & 255 ) / 255,
            1
          )
          // countyIndexes.push(i * 100)
          // countyIndexes.push(block.id)
          offsets.push( 
            block.x - 650 + block.w/2,
            -block.y + 380 - block.h/2,
            0
          )
          uvOffsets.push(
            (block.fit.x) / 1024,
            -(block.fit.y) / 1024
          )
          uvScales.push(
            block.w / 1024,
            block.h / 1024
          )
        }
        
        this.offsets = offsets

        var geometry = new THREE.InstancedBufferGeometry()
        geometry.copy( new THREE.PlaneBufferGeometry(1, 1, 1, 1))
    
        geometry.maxInstancedCount = instances; // set so its initalized for dat.GUI, will be set in first draw otherwise

        geometry.addAttribute( 'ratio', new THREE.InstancedBufferAttribute( new Float32Array( ratios ), 1 ) );
        geometry.addAttribute( 'countyIndex', new THREE.InstancedBufferAttribute( new Float32Array( countyIndexes ), 1 ) );
        geometry.addAttribute( 'countyTag', new THREE.InstancedBufferAttribute( new Float32Array( countyTags ), 4 ) );
        geometry.addAttribute( 'offset', new THREE.InstancedBufferAttribute( new Float32Array( offsets ), 3 ) );
        geometry.addAttribute( 'uvOffsets', new THREE.InstancedBufferAttribute( new Float32Array( uvOffsets ), 2 ) );
        geometry.addAttribute( 'uvScales', new THREE.InstancedBufferAttribute( new Float32Array( uvScales ), 2 ) );
        var canvasTexture = new THREE.CanvasTexture(this.$refs['packed-counties-canvas'])
        
        var material = new THREE.RawShaderMaterial( {
          uniforms: {
            map: { value: canvasTexture },
            time: { value: 1.0 },
            sineTime: { value: 1.0 },
            isPicking: { type: 'f', value: 0.0 }
          },
          vertexShader: this.vertexShader,
          fragmentShader: this.fragmentShader,
          side: THREE.FrontSide,
          // side: THREE.DoubleSide,
          transparent: true
        } );

        mesh = new THREE.Mesh( geometry, material );
        scene.add( mesh );

        window.addEventListener( 'resize', onWindowResize, false );
        // const TIMEOUT = 10000
        // this.inactivityTimeout = TIMEOUT
        // window.addEventListener( 'touchstart', () => this.inactivityTimeout = TIMEOUT, false )
        // window.addEventListener( 'mousedown', () => this.inactivityTimeout = TIMEOUT, false )
        // window.addEventListener( 'touchcancel', () => this.inactivityTimeout = TIMEOUT, false )
        // window.addEventListener( 'touchend', () => this.inactivityTimeout = TIMEOUT, false )
        // window.addEventListener( 'mouseup', () => this.inactivityTimeout = TIMEOUT, false )
        // window.addEventListener( 'mouseout', () => this.inactivityTimeout = TIMEOUT, false )
        canvas.addEventListener( 'touchstart', () => mouseIsDown = true, false )
        canvas.addEventListener( 'mousedown', () => mouseIsDown = true, false )
        canvas.addEventListener( 'mousemove', (event) => {
          mouseIsDown = true
          this.mouse.x = event.pageX - canvas.offsetLeft
          this.mouse.y = event.pageY - canvas.offsetTop
          if (this.lastMouse.x === this.mouse.x && this.lastMouse.y === this.mouse.y) {
            return
          }
          this.lastMouse.x = this.mouse.x
          this.lastMouse.y = this.mouse.y
          samplePoint()
        }, false )
        canvas.addEventListener( 'touchcancel', () => mouseIsDown = false, false )
        canvas.addEventListener( 'touchend', () => mouseIsDown = false, false )
        canvas.addEventListener( 'mouseup', () => mouseIsDown = false, false )
        canvas.addEventListener( 'mouseout', () => mouseIsDown = false, false )


      }

      const onWindowResize = () => {

        camera.aspect = this.canvasWidth / this.canvasHeight;
        // camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( this.canvasWidth, this.canvasHeight );
        render(clock.getDelta())
      }

      const animate = () => {
        requestAnimationFrame( animate );
        var time = clock.getDelta()
        if (mouseIsDown) {
          render(time)
        }
      }

      const render = (time) => {
        // console.log(elapsedTime)
        var object = scene.children[ 0 ];
        object.material.uniforms.time.value = object.material.uniforms.time.value + time * 1
        // object.material.uniforms.time.value = time * 0.005;


        // mesh.material.uniforms.isPicking.value = 1
        // mesh.material.uniforms.isPicking.needsUpdate = true
        
        renderer.render( scene, camera );
      }

      const samplePoint = () => {
        // console.log('Sample point', this.mouse.x, this.mouse.y)
        // object.material.uniforms.isPicking.value = 1
        mesh.material.uniforms.isPicking.value = 1
        mesh.material.uniforms.isPicking.needsUpdate = true
        renderer.render( scene, camera, pickingRenderTarget, true)
        renderer.readRenderTargetPixels(
          pickingRenderTarget,
          this.mouse.x,
          pickingRenderTarget.height - this.mouse.y,
          1,
          1,
          pixelBuffer
        );

        // interpret the pixel as an ID
        var id =
          ( pixelBuffer[ 0 ] << 16 ) |
          ( pixelBuffer[ 1 ] << 8 ) |
          ( pixelBuffer[ 2 ] );

        id -= 1

        // id /= 100;
        if (id >= 0) {
          const index = id
          if (id >= this.counties.length) {
            // eslint-disable-next-line
            console.error('ERROR! ---> ', id, '>', this.counties.length, pixelBuffer)
          } else {
            // console.log('good ---> ', id, '>', this.counties.length, pixelBuffer)
          const code = this.counties[index].id
          const name = names[code]

          if (name !== this.currentCounty) {
            this.currentCounty = name
            // eslint-disable-next-line
            // console.log('County of', name, {id, code, mouse:this.mouse}, this.counties[index])
            const distance = (x1, y1, x2, y2) => Math.hypot(x2-x1, y2-y1)
            // update values attributes
            const {array} = mesh.geometry.attributes.ratio
            const c1X = this.offsets[id * 3]
            const c1Y = this.offsets[id * 3 + 1]
            for (let i = 0, i3 = 0, l = mesh.geometry.attributes.ratio.array.length; i < l; i++, i3+=3) {
              const c2X = this.offsets[i3]
              const c2Y = this.offsets[i3+1]
              array[i] = (Math.sin(distance(c1X + 2500, c1Y + 2500, c2X + 2500, c2Y + 2500) / 250) + 1 ) / 2 
              
              array[i] = -1 + 2 * array[i]
            }
            mesh.geometry.attributes.ratio.needsUpdate = true
          }
          }

        } else {
          // reset
          if (this.currentCounty !== null) {
            this.currentCounty = null
            for (let i = 0, i3 = 0, l = mesh.geometry.attributes.ratio.array.length; i < l; i++, i3+=3) {
              mesh.geometry.attributes.ratio.array[i] = RESET_VALUE
              mesh.geometry.attributes.ratio.needsUpdate = true
            }
            console.log('GO!')          
          }
        }
        mesh.material.uniforms.isPicking.value = 0


      }

      init()
      animate()
      render(clock.getDelta())

    }
  }
}
</script>

<style lang="scss">
.map-us {
  .map-svg {
    width: auto;
    max-width: 960px;
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
  .test-svg {
    width: auto;
    min-height: 40px;
    background: black;
    cursor: pointer;
    path {
      fill: red;
      stroke: none;
      stroke-width: 0;
    }
  }
  .counties-canvas {
    max-width: 960px;
    width: auto;
  }
  .packed-counties-canvas {
    max-width: 960px;
    background: #0c0c0c;
  }
  .county-label {
    position: absolute;
    width: 100%;
    margin-top: 40px;
    font-size: 30px;
  }
  .counties-webgl-canvas {
    margin: 0 auto;
    height: auto;
  }
}
</style>