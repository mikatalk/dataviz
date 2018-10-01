<template>
  <div class="map-us">

    US Counties
    
    <svg
      ref="map-svg"
      class="map-svg"
      width="960"
      heoght="600"
      viewBox="0 0 960 600"
      preserveAspectRatio="xMidYMid meet"></svg>

    <hr/>

    Next use <em>getBBox()</em> to get each county bounds
    <br/>
    <svg
      @click="randomize"
      ref="test-svg"
      class="test-svg"
      preserveAspectRatio="xMidYMid meet"></svg>
    <br/>
    Click on the SVG to randomize the state

    <hr/>

    <canvas
      class="counties-canvas"
      ref="counties-canvas"
      />

    <hr/>

    <canvas
      class="packed-counties-canvas"
      ref="packed-counties-canvas"
      />

    <hr/>

    <canvas
      class="counties-webgl-canvas"
      ref="counties-webgl-canvas"
      />

  </div>
</template>

<script>

import * as d3 from "d3";
import * as topojson from 'topojson'
import us from '@/data/us-10m.v1.json'
import GrowingPacker from '@/utils/GrowingPacker'
import * as THREE from 'three'
const OrbitControls = require('three-orbit-controls')(THREE)

export default {
  name: 'home',
  data: () => ({
        vertexShader: `
      precision highp float;

      uniform float sineTime;

      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;

attribute vec2 uv;
varying vec2 vUv;

      attribute vec3 position;
      attribute vec3 offset;
      attribute vec4 color;
      attribute vec4 orientationStart;
      attribute vec4 orientationEnd;

      attribute vec2 uvOffsets;
      attribute vec2 uvScales;

      varying vec3 vPosition;
      // varying vec4 vColor;

      void main(){

vec3 pos = position * vec3(uvScales.xy, 1.0);//*1024.0;

        // vPosition = offset * max( abs( sineTime * 2.0 + 1.0 ), 0.5 ) + position;
        // vec4 orientation = normalize( mix( orientationStart, orientationEnd, sineTime ) );
        // vec3 vcV = cross( orientation.xyz, vPosition );
        // vPosition = vcV * ( 2.0 * orientation.w ) + ( cross( orientation.xyz, vcV ) * 2.0 + vPosition );
vPosition = pos + offset;


vUv = uvOffsets / 1024.0;
vUv += (uvScales / uv);
// vUv += (uv *1024.0 / uvScales)/1024.0;


        gl_Position = projectionMatrix * modelViewMatrix * vec4( vPosition, 1.0 );

      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float time;
      varying vec3 vPosition;
      // varying vec4 vColor;
uniform sampler2D map;
varying vec2 vUv;
      void main() {
        vec4 color = texture2D(map, vUv);
        // vec4 color = vec4( vColor );
        // color.r += sin( vPosition.x * 10.0 + time ) * 0.5;
        gl_FragColor = color;
      }
    `
  }),
  mounted () {

    const scale = 1.21
    this.createD3Map()
    const blocks = this.runTexturePacker(scale)
    this.drawCounties(blocks, scale)
    this.createWebGLMap(blocks)
  },
  methods: {
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
    runTexturePacker (scale) {
      const blocks = [...this.$refs['map-svg'].querySelectorAll('g.counties path')]
        .map(path => {
          const { x, y, width, height } = path.getBBox()
          return {
            x: x * scale,
            y: y * scale,
            w: width * scale,
            h: height * scale,
            path
          }
        })
        .sort((a, b) => (Math.max(b.w, b.h) - Math.max(a.w, a.h)))

      const packer = new GrowingPacker()
      packer.fit(blocks)
      return blocks
    },
    drawCounties (blocks, scale) {
      const canvas = this.$refs['counties-canvas']
      canvas.width = 960
      canvas.height = 600
      const context = canvas.getContext('2d')
      context.strokeStyle = '#00f'
      context.lineWidth = 1
      context.fillStyle = '#0f0'

      const canvasPacked = this.$refs['packed-counties-canvas']
      canvasPacked.width = 1024
      canvasPacked.height = 1024
      const contextPacked = canvasPacked.getContext('2d')
      contextPacked.strokeStyle = 'red'
      contextPacked.lineWidth = 3
      // contextPacked.fillStyle = 'white'

      let i = 0
      for(let block of blocks) {
        if (block.fit) {

          const path = new Path2D(block.path.getAttribute('d'))

          context.fillStyle = `hsl(${360 * Math.random()}, 50%, 50%)`
          context.stroke(path)
          context.fill(path)
          context.restore()

          contextPacked.save()
          contextPacked.fillStyle = `hsl(${360 * Math.random()}, 50%, 50%)`
          contextPacked.translate(-block.x, -block.y)
          contextPacked.translate(block.fit.x, block.fit.y)
          contextPacked.scale(scale, scale)
          contextPacked.stroke(path)
          contextPacked.fill(path)
          contextPacked.restore()

        } else {
          // eslint-disable-next-line
          console.warn(`Error packing county at ${i}`)
        }
        i = i + 1
      }
    },
    createWebGLMap (blocks) {



		var camera, scene, renderer, controls;


		const init = () => {
  
      renderer = new THREE.WebGLRenderer({
        canvas: this.$refs['counties-webgl-canvas'],
        antialias: true
      });
			renderer.setPixelRatio( window.devicePixelRatio );
			renderer.setSize( window.innerWidth, window.innerHeight );
			// container.appendChild( renderer.domElement );

			if ( renderer.extensions.get( 'ANGLE_instanced_arrays' ) === null ) {

				document.getElementById( 'notSupported' ).style.display = '';
				return;

			}


			// container = document.getElementById( 'container' );

			camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 100000 );
			camera.position.z = 1000

			scene = new THREE.Scene();

      controls = new OrbitControls(camera)
      // controls = new OrbitControls(camera, renderer.domElement)
			controls.enableKeys = true;
			controls.enableZoom = false;
			controls.maxPolarAngle = Math.PI / 2;
      // geometry
      document.addEventListener('keydown', e => {
        if (e.key == '=') {
					camera.position.z -= 10
					render()
        } else if (e.key == '-') {
					camera.position.z += 10
					render()
        }
      })


			var vector = new THREE.Vector4();

			var instances = blocks.length;

			// // var positions = [];
			var offsets = [];
			var offsets = [];
			var uvOffsets = [];
			var uvScales = [];
			// var uvMaps = []; // uvOffsetX, uvOffsetY
			// var colors = [];
			// var orientationsStart = [];
			// var orientationsEnd = [];

			// // positions.push( 0.025, -0.025, 0 );
			// // positions.push( -0.025, 0.025, 0 );
			// // positions.push( 0, 0, 0.025 );

			// // instanced attributes

			// for ( var i = 0; i < instances; i ++ ) {
			for (let block of blocks) {
// console.log('BLOCK', block)
			// 	// offsets

				offsets.push( 
          block.x - 500 + block.w/2,
          -(block.y - 350 + block.h/2),
          0
          // (Math.random() - 0.5) * 5,
          // (Math.random() - 0.5) * 5,
          // (Math.random() - 0.5) * 5,
        )
        uvOffsets.push(
          block.fit.x,
          block.fit.y
        )
        uvScales.push(
					block.w,
					block.h
          // 10, 10
          // 1 / 1024 * block.fit.w,
          // 1 / 1024 * block.fit.h
        )

			// 	// colors

			// 	colors.push( Math.random(), Math.random(), Math.random(), Math.random() );

			// 	// orientation start

			// 	vector.set( Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1 );
			// 	vector.normalize();

			// 	orientationsStart.push( vector.x, vector.y, vector.z, vector.w );

			// 	// orientation end

				// vector.set( Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1 );
				// vector.normalize();

				// orientationsEnd.push( vector.x, vector.y, vector.z, vector.w );

			}

			var geometry = new THREE.InstancedBufferGeometry()
			geometry.copy( new THREE.PlaneBufferGeometry(1, 1, 1, 1))
	
      // var geometry = new THREE.InstancedBufferGeometry();
      // const planeGeo = new THREE.PlaneBufferGeometry();
      // const geometry = new THREE.PlaneB
			geometry.maxInstancedCount = instances; // set so its initalized for dat.GUI, will be set in first draw otherwise

			// geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );

			geometry.addAttribute( 'offset', new THREE.InstancedBufferAttribute( new Float32Array( offsets ), 3 ) );
			geometry.addAttribute( 'uvOffsets', new THREE.InstancedBufferAttribute( new Float32Array( uvOffsets ), 2 ) );
			geometry.addAttribute( 'uvScales', new THREE.InstancedBufferAttribute( new Float32Array( uvScales ), 2 ) );
			// geometry.addAttribute( 'color', new THREE.InstancedBufferAttribute( new Float32Array( colors ), 4 ) );
			// geometry.addAttribute( 'orientationStart', new THREE.InstancedBufferAttribute( new Float32Array( orientationsStart ), 4 ) );
			// geometry.addAttribute( 'orientationEnd', new THREE.InstancedBufferAttribute( new Float32Array( orientationsEnd ), 4 ) );
// console.log('plane geo:', planeGeo)
// 		  geometry.addAttribute( 'position', planeGeo.attributes.position )
// 		  geometry.addAttribute( 'uv', planeGeo.attributes.uv )
// 		  geometry.addAttribute( 'normal', planeGeo.attributes.normal )
// // geometry.computeVertex()
      // var uvs = new THREE.InterleavedBufferAttribute( vertexBuffer, 2, 4 );
		  // geometry.addAttribute( 'uv', uvs );

			// material

var canvasTexture = new THREE.CanvasTexture(this.$refs['packed-counties-canvas'])
// canvasTexture.minFil
// texture1.anisotropy = maxAnisotropy;
canvasTexture.wrapS = canvasTexture.wrapT = THREE.RepeatWrapping;
canvasTexture.repeat.set(1024, 1024)

			var material = new THREE.RawShaderMaterial( {

				uniforms: {
  				map: { value: canvasTexture },
					time: { value: 1.0 },
					sineTime: { value: 1.0 }
				},
				vertexShader: this.vertexShader,
				fragmentShader: this.fragmentShader,
				side: THREE.FrontSide,
				// side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.01

			} );

			//

			var mesh = new THREE.Mesh( geometry, material );
			scene.add( mesh );

			//

					//

			// var gui = new dat.GUI( { width: 350 } );
			// gui.add( geometry, 'maxInstancedCount', 0, instances );

			//

			// stats = new Stats();
			// container.appendChild( stats.dom );

			//

			window.addEventListener( 'resize', onWindowResize, false );

		}

		const onWindowResize = () => {

			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();

			renderer.setSize( window.innerWidth, window.innerHeight );
render()
		}

		//

		const animate = () => {

			// requestAnimationFrame( animate );

			render();
			// stats.update();

		}

		const render = () => {

			var time = performance.now();

			var object = scene.children[ 0 ];

			// object.rotation.y = time * 0.0005;
			object.material.uniforms.time.value = time * 0.005;
			object.material.uniforms.sineTime.value = Math.sin( object.material.uniforms.time.value * 0.05 );

			renderer.render( scene, camera );

    }
    

		init()
    animate()
    
    }
  }
}
</script>

<style lang="scss">
.map-us {
  .map-svg {
    width: 100%;
    path {
      fill: rgba(255,255,255,0.6);
      stroke: black;
      stroke-width: 0.1px;
    }
  }
  .test-svg {
    width: auto;
    min-height: 40px;
    // border: 1px solid black;
    background: black;
    path {
      fill: red;
      stroke: none;
      stroke-width: 0;
    }
  }
  .counties-canvas{
    max-width: 100%;
  }
  .packed-counties-canvas{
    max-width: 100%;
  }
}
</style>
