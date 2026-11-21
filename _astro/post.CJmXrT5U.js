const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["_astro/SMAAPass.CO7iYAu_.js","_astro/three.K_D8JuOu.js","_astro/Pass.Cs7oPokT.js","_astro/FXAAShader.DwaIoz7q.js"])))=>i.map(i=>d[i]);
import{t as e}from"./preload.CxFQXtKk.js";import{Cn as t,En as n,I as r,Lt as i,Xt as a,_n as o,dn as s,et as c,h as l,m as u,nt as d,ut as f,vn as p,w as m,wn as h,xn as g}from"./three.K_D8JuOu.js";import{n as _,t as v}from"./Pass.Cs7oPokT.js";import{v as y}from"./kit.DYS3rJ69.js";import{d as b}from"./character.Bo5BstEr.js";var x={name:`CopyShader`,uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`},S=class extends _{constructor(e,t=`tDiffuse`){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof a?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=o.clone(e.uniforms),this.material=new a({name:e.name===void 0?`unspecified`:e.name,defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new v(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},C=class extends _{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){let r=e.getContext(),i=e.state;i.buffers.color.setMask(!1),i.buffers.depth.setMask(!1),i.buffers.color.setLocked(!0),i.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),i.buffers.stencil.setTest(!0),i.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),i.buffers.stencil.setFunc(r.ALWAYS,a,4294967295),i.buffers.stencil.setClear(o),i.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),i.buffers.color.setLocked(!1),i.buffers.depth.setLocked(!1),i.buffers.color.setMask(!0),i.buffers.depth.setMask(!0),i.buffers.stencil.setLocked(!1),i.buffers.stencil.setFunc(r.EQUAL,1,4294967295),i.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),i.buffers.stencil.setLocked(!0)}},w=class extends _{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}},T=class{constructor(e,i){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),i===void 0){let a=e.getSize(new t);this._width=a.width,this._height=a.height,i=new n(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:r}),i.texture.name=`EffectComposer.rt1`}else this._width=i.width,this._height=i.height;this.renderTarget1=i,this.renderTarget2=i.clone(),this.renderTarget2.texture.name=`EffectComposer.rt2`,this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new S(x),this.copyPass.material.blending=0,this.timer=new s}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());let t=this.renderer.getRenderTarget(),n=!1;for(let t=0,r=this.passes.length;t<r;t++){let r=this.passes[t];if(r.enabled!==!1){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(t),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),r.needsSwap){if(n){let t=this.renderer.getContext(),n=this.renderer.state.buffers.stencil;n.setFunc(t.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),n.setFunc(t.EQUAL,1,4294967295)}this.swapBuffers()}C!==void 0&&(r instanceof C?n=!0:r instanceof w&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){let n=this.renderer.getSize(new t);this._pixelRatio=this.renderer.getPixelRatio(),this._width=n.width,this._height=n.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let n=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(n,r),this.renderTarget2.setSize(n,r);for(let e=0;e<this.passes.length;e++)this.passes[e].setSize(n,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}},E=class extends _{constructor(e,t,n=null,r=null,i=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=r,this.clearAlpha=i,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new u}render(e,t,n){let r=e.autoClear;e.autoClear=!1;let i,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(i=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==1&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(i),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=r}},D={name:`LuminosityHighPassShader`,uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new u(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`},O=class e extends _{constructor(e,i=1,s,l){super(),this.strength=i,this.radius=s,this.threshold=l,this.resolution=e===void 0?new t(256,256):new t(e.x,e.y),this.clearColor=new u(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let d=Math.round(this.resolution.x/2),f=Math.round(this.resolution.y/2);this.renderTargetBright=new n(d,f,{type:r,depthBuffer:!1}),this.renderTargetBright.texture.name=`UnrealBloomPass.bright`,this.renderTargetBright.texture.generateMipmaps=!1;for(let e=0;e<this.nMips;e++){let t=new n(d,f,{type:r,depthBuffer:!1});t.texture.name=`UnrealBloomPass.h`+e,t.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(t);let i=new n(d,f,{type:r,depthBuffer:!1});i.texture.name=`UnrealBloomPass.v`+e,i.texture.generateMipmaps=!1,this.renderTargetsVertical.push(i),d=Math.round(d/2),f=Math.round(f/2)}let p=D;this.highPassUniforms=o.clone(p.uniforms),this.highPassUniforms.luminosityThreshold.value=l,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new a({uniforms:this.highPassUniforms,vertexShader:p.vertexShader,fragmentShader:p.fragmentShader}),this.separableBlurMaterials=[];let m=[6,10,14,18,22];d=Math.round(this.resolution.x/2),f=Math.round(this.resolution.y/2);for(let e=0;e<this.nMips;e++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(m[e])),this.separableBlurMaterials[e].uniforms.invSize.value=new t(1/d,1/f),d=Math.round(d/2),f=Math.round(f/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=i,this.compositeMaterial.uniforms.bloomRadius.value=.1;let g=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=g,this.bloomTintColors=[new h(1,1,1),new h(1,1,1),new h(1,1,1),new h(1,1,1),new h(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=o.clone(x.uniforms),this.blendMaterial=new a({uniforms:this.copyUniforms,vertexShader:x.vertexShader,fragmentShader:x.fragmentShader,premultipliedAlpha:!0,blending:2,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new u,this._oldClearAlpha=1,this._basic=new c,this._fsQuad=new v(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,n){let r=Math.round(e/2),i=Math.round(n/2);this.renderTargetBright.setSize(r,i);for(let e=0;e<this.nMips;e++)this.renderTargetsHorizontal[e].setSize(r,i),this.renderTargetsVertical[e].setSize(r,i),this.separableBlurMaterials[e].uniforms.invSize.value=new t(1/r,1/i),r=Math.round(r/2),i=Math.round(i/2)}render(t,n,r,i,a){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),a&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=r.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=r.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let s=this.renderTargetBright;for(let n=0;n<this.nMips;n++)this._fsQuad.material=this.separableBlurMaterials[n],this.separableBlurMaterials[n].uniforms.colorTexture.value=s.texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[n]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[n].uniforms.colorTexture.value=this.renderTargetsHorizontal[n].texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[n]),t.clear(),this._fsQuad.render(t),s=this.renderTargetsVertical[n];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,a&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(r),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(e){let n=[],r=e/3;for(let t=0;t<e;t++)n.push(.39894*Math.exp(-.5*t*t/(r*r))/r);let i=[],o=[];for(let t=1;t<e;t+=2){let r=n[t],a=t+1<e?n[t+1]:0,s=r+a;i.push((t*r+(t+1)*a)/s),o.push(s)}return new a({defines:{KERNEL_PAIRS:i.length},uniforms:{colorTexture:{value:null},invSize:{value:new t(.5,.5)},direction:{value:new t(.5,.5)},centerWeight:{value:n[0]},gaussianOffsets:{value:i},gaussianWeights:{value:o}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float centerWeight;
				uniform float gaussianOffsets[KERNEL_PAIRS];
				uniform float gaussianWeights[KERNEL_PAIRS];

				void main() {

					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * centerWeight;

					for ( int i = 0; i < KERNEL_PAIRS; i ++ ) {

						vec2 uvOffset = direction * invSize * gaussianOffsets[ i ];
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * gaussianWeights[ i ];

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(e){return new a({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}};O.BlurDirectionX=new t(1,0),O.BlurDirectionY=new t(0,1);var k={name:`OutputShader`,uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`},A=class extends _{constructor(){super(),this.isOutputPass=!0,this.uniforms=o.clone(k.uniforms),this.material=new i({name:k.name,uniforms:this.uniforms,vertexShader:k.vertexShader,fragmentShader:k.fragmentShader}),this._fsQuad=new v(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},l.getTransfer(this._outputColorSpace)===`srgb`&&(this.material.defines.SRGB_TRANSFER=``),this._toneMapping===1?this.material.defines.LINEAR_TONE_MAPPING=``:this._toneMapping===2?this.material.defines.REINHARD_TONE_MAPPING=``:this._toneMapping===3?this.material.defines.CINEON_TONE_MAPPING=``:this._toneMapping===4?this.material.defines.ACES_FILMIC_TONE_MAPPING=``:this._toneMapping===6?this.material.defines.AGX_TONE_MAPPING=``:this._toneMapping===7?this.material.defines.NEUTRAL_TONE_MAPPING=``:this._toneMapping===5&&(this.material.defines.CUSTOM_TONE_MAPPING=``),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},j={uniforms:{tDiffuse:{value:null},tNormal:{value:null},tDepth:{value:null},texel:{value:new t},cameraNear:{value:.1},cameraFar:{value:400},ink:{value:new u(`#05050a`)},thickness:{value:1},thin:{value:0},fadeNear:{value:60},fadeFar:{value:140}},vertexShader:`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,fragmentShader:`
    #include <packing>
    uniform sampler2D tDiffuse;
    uniform sampler2D tNormal;
    uniform sampler2D tDepth;
    uniform vec2 texel;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform vec3 ink;
    uniform float thickness;
    uniform float thin;
    uniform float fadeNear;
    uniform float fadeFar;
    varying vec2 vUv;

    float dist(vec2 uv) {
      return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar);
    }
    vec3 nrm(vec2 uv) { return texture2D(tNormal, uv).rgb * 2.0 - 1.0; }

    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      // A NaN or infinite pixel (a broken mesh, something too bright for the half-float target) would be spread by
      // the bloom's blur over the whole screen and black it out: it's one dark pixel instead. (Written as a
      // comparison NaN fails, which drivers keep, rather than isnan(), which some optimise away)
      if (!(abs(col.r) + abs(col.g) + abs(col.b) < 6.0e4)) col.rgb = vec3(0.0);
      vec2 o = texel * thickness;
      float d0 = dist(vUv);
      float dl = dist(vUv - vec2(o.x, 0.0));
      float dr = dist(vUv + vec2(o.x, 0.0));
      float du = dist(vUv + vec2(0.0, o.y));
      float dd = dist(vUv - vec2(0.0, o.y));
      // Second derivative of depth: flat or evenly sloping surfaces cancel out,
      // silhouettes and steps don't.
      // Thin: only the nearer side of a silhouette (its neighbours further away) takes the ink
      float lx = dl + dr - 2.0 * d0, ly = du + dd - 2.0 * d0;
      float lap = mix(abs(lx) + abs(ly), max(lx, 0.0) + max(ly, 0.0), thin) / max(d0, 0.1);
      // Thin (phones): wider ramps, so an edge's ink fades in over its strength and FXAA has a gradient to smooth
      float depthEdge = smoothstep(mix(0.012, 0.007, thin), mix(0.03, 0.05, thin), lap);

      vec3 n0 = nrm(vUv);
      // Thin: a crease is found from one side (the right and up neighbours, counted twice), so one pixel row takes it
      float fr = 1.0 - dot(n0, nrm(vUv + vec2(o.x, 0.0)));
      float fu = 1.0 - dot(n0, nrm(vUv + vec2(0.0, o.y)));
      float nd = mix(fr + fu + (1.0 - dot(n0, nrm(vUv - vec2(o.x, 0.0)))) + (1.0 - dot(n0, nrm(vUv - vec2(0.0, o.y)))), 2.0 * (fr + fu), thin);
      float normalEdge = smoothstep(mix(0.35, 0.25, thin), mix(0.8, 1.1, thin), nd);

      float nearest = min(min(min(dl, dr), min(du, dd)), d0);
      float fade = 1.0 - smoothstep(fadeNear, fadeFar, nearest);
      float e = max(depthEdge, normalEdge) * fade;
      gl_FragColor = vec4(mix(col.rgb, ink, e), col.a);
    }
  `};function M(i,a,o,s){let c=i.getDrawingBufferSize(new t),l=new m(c.x,c.y);l.type=g;let h=new n(c.x,c.y,{depthTexture:l,type:p}),_=new d;_.onBeforeCompile=e=>{y(e),b(e)},_.customProgramCacheKey=()=>`normal-crowd-wind`;let v=new T(i,new n(c.x,c.y,{type:r,samples:s.msaa}));v.renderTarget2.samples=0,v.renderTarget2.depthBuffer=!1;let x=()=>{v.readBuffer=v.renderTarget1,v.writeBuffer=v.renderTarget2};v.addPass(new E(a,o));let C=new S(j);C.uniforms.tNormal.value=h.texture,C.uniforms.tDepth.value=l,C.uniforms.thin.value=+!!s.thinInk,v.addPass(C);let w=new O(new t(c.x*s.bloomScale,c.y*s.bloomScale),.8,.55,.86);if(v.addPass(w),s.bloomMips&&s.bloomMips<w.nMips){let e=w.compositeMaterial.uniforms.bloomFactors.value;for(let t=s.bloomMips;t<e.length;t++)e[t]=0;w.nMips=s.bloomMips}v.addPass(new A);let D=null;s.smaa&&e(async()=>{let{SMAAPass:e}=await import(`./SMAAPass.CO7iYAu_.js`);return{SMAAPass:e}},__vite__mapDeps([0,1,2])).then(({SMAAPass:e})=>{let t=new e;D=t,v.addPass(t)});let k=new t(c.x,c.y),M=null;s.fxaa&&e(async()=>{let{FXAAShader:e}=await import(`./FXAAShader.DwaIoz7q.js`);return{FXAAShader:e}},__vite__mapDeps([3,1])).then(({FXAAShader:e})=>{M=new S(e),M.uniforms.resolution.value.set(1/k.x,1/k.y),v.addPass(M)});function N(e,t,n){v.setPixelRatio(n),v.setSize(e,t);let r=Math.floor(e*n),i=Math.floor(t*n);h.setSize(r,i),w.resolution.set(r*s.bloomScale,i*s.bloomScale),w.setSize(r*s.bloomScale,i*s.bloomScale),C.uniforms.texel.value.set(1/r,1/i),k.set(r,i),M?.uniforms.resolution.value.set(1/r,1/i),C.uniforms.thickness.value=s.thinInk?1:Math.max(1,n*.9)}let P=new u;i.shadowMap.autoUpdate=!1;let F={calls:0,tris:0},I=i.shadowMap,L=I.render.bind(I),R=(...e)=>{I.needsUpdate=!0,L(...e)};I.render=(...e)=>{if(!I.enabled||!I.needsUpdate)return;let{calls:t,triangles:n}=i.info.render;s.shadows?s.shadows.drawShadows(R,e[1],e[2]):L(...e),I.needsUpdate=!1,F.calls+=i.info.render.calls-t,F.tris+=i.info.render.triangles-n};let z=new f;function B(){i.shadowMap.needsUpdate=i.shadowMap.enabled,z.copy(o,!1),z.matrixAutoUpdate=z.matrixWorldAutoUpdate=!1,z.far=Math.min(o.far,C.uniforms.fadeFar.value+5),z.updateProjectionMatrix(),o.updateMatrixWorld(),z.matrixWorld.copy(o.matrixWorld),z.matrixWorldInverse.copy(o.matrixWorldInverse),C.uniforms.cameraNear.value=z.near,C.uniforms.cameraFar.value=z.far;let e=a.background,t=a.fog;a.background=null,a.fog=null,a.overrideMaterial=_,z.layers.set(0),i.getClearColor(P);let n=i.getClearAlpha();i.setRenderTarget(h),i.setClearColor(8421631,1),i.clear(),i.render(a,z),a.overrideMaterial=null,z.layers.set(2);let r=i.autoClear;i.autoClear=!1,i.render(a,z),i.autoClear=r,i.setClearColor(P,n),a.overrideMaterial=null,a.background=e,a.fog=t,o.layers.set(0),o.layers.enable(1),i.setRenderTarget(null),x(),v.render()}let V=w;return{composer:v,bloom:w,ink:C,render:B,setSize:N,shadowStat:F,targets:()=>[v.renderTarget1,v.renderTarget2,h,V.renderTargetBright,...V.renderTargetsHorizontal,...V.renderTargetsVertical,...D?._edgesRT&&D._weightsRT?[D._edgesRT,D._weightsRT]:[]]}}export{M as t};