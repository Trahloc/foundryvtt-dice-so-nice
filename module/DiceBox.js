import { DICE_MODELS } from './DiceModels.js';
import { DiceSFXManager } from './DiceSFXManager.js';
import { RendererStats } from './libs/threex.rendererstats.js';
//import {GLTFExporter} from 'three/examples/jsm/loaders/exporters/GLTFExporter.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { SMAAPass } from './libs/SMAAPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { TransparentUnrealBloomPass } from './libs/TransparentUnrealBloomPass.js';

import * as THREE from 'three';


export class DiceBox {

	constructor(element_container, dice_factory, config) {
		//private variables
		this.known_types = ['d4', 'd6', 'd8', 'd10', 'd12', 'd14', 'd16', 'd20', 'd24', 'd30', 'd100'];
		this.container = element_container;
		this.dimensions = config.dimensions;
		this.dicefactory = dice_factory;
		this.config = config;
		this.speed = 1;
		this.isVisible = false;
		this.last_time = 0;
		this.running = false;
		this.allowInteractivity = false;
		this.raycaster = new THREE.Raycaster();
		this.blackColor = new THREE.Color(0, 0, 0);
		this.nbIterationsBetweenRolls = 15;

		this.display = {
			currentWidth: null,
			currentHeight: null,
			containerWidth: null,
			containerHeight: null,
			aspect: null,
			scale: null
		};

		this.mouse = {
			pos: new THREE.Vector2(),
			startDrag: undefined,
			startDragTime: undefined,
			constraintDown: false,
			constraint: null
		};

		this.cameraHeight = {
			max: null,
			close: null,
			medium: null,
			far: null
		};


		this.clock = new THREE.Clock();
		this.sounds_table = {};
		this.sounds_dice = {};
		this.sounds_coins = [];

		this.iteration;
		this.renderer;
		this.barrier;
		this.camera;
		this.light;
		this.light_amb;
		this.desk;
		this.pane;

		//public variables
		this.public_interface = {};
		this.diceList = []; //'private' variable
		this.deadDiceList = [];
		this.framerate = (1 / 60);
		this.sounds = true;
		this.volume = 1;

		this.soundsSurface = "felt";
		this.animstate = '';
		this.throwingForce = "medium";
		this.immersiveDarkness = true;
		this.toneMappingExposureDefault = 1.0;

		this.selector = {
			animate: true,
			rotate: true,
			intersected: null,
			dice: []
		};
		this.showExtraDice = false;
		this.muteSoundSecretRolls = false;

		this.colors = {
			ambient: 0xffeeb1,
			spotlight: 0x000000,
			ground: 0x080820
		};

		this.rethrowFunctions = {};
		this.afterThrowFunctions = {};

	}

	preloadSounds() {
		//Surfaces
		fetch(`modules/dice-so-nice/sounds/surfaces.json`).then(res => {
			res.json().then(json => {
				AudioHelper.preloadSound(`modules/dice-so-nice/sounds/${json.resources[0]}`).then(src => this.sounds_table.source = src);
				Object.entries(json.spritemap).forEach(sound => {
					let type = sound[0].match(/surface\_([a-z\_]*)/)[1];
					if (!this.sounds_table[type])
						this.sounds_table[type] = [];
					this.sounds_table[type].push(sound[1]);
				});
			});
		});

		//Hits
		fetch(`modules/dice-so-nice/sounds/dicehit.json`).then(res => {
			res.json().then(json => {
				this.sounds_dice.source = AudioHelper.preloadSound(`modules/dice-so-nice/sounds/${json.resources[0]}`).then(src => this.sounds_dice.source = src);
				Object.entries(json.spritemap).forEach(sound => {
					let type = sound[0].match(/dicehit\_([a-z\_]*)/)[1];
					if (!this.sounds_dice[type])
						this.sounds_dice[type] = [];
					this.sounds_dice[type].push(sound[1]);
				});
			});
		});
	}

	playAudioSprite(source, sprite, selfVolume) {
		if (!source || !source.context)
			return false;
		let gainNode = source.context.createGain();
		gainNode.gain.value = selfVolume * this.volume * game.settings.get("core", "globalInterfaceVolume");
		const startTime = sprite.start;
		const duration = sprite.end - sprite.start;
		const sampleSource = source.context.createBufferSource();
		sampleSource.buffer = source.container.buffer;
		sampleSource.connect(gainNode).connect(source.context.destination);
		sampleSource.start(source.context.currentTime, startTime, duration);
	}

	initialize() {
		return new Promise(async resolve => {
			game.audio.pending.push(this.preloadSounds.bind(this));

			await this.dicefactory.preloadPresets();

			this.sounds = this.config.sounds == '1';
			this.volume = this.config.soundsVolume;
			this.soundsSurface = this.config.soundsSurface;
			this.showExtraDice = this.config.showExtraDice;
			this.muteSoundSecretRolls = this.config.muteSoundSecretRolls;

			this.allowInteractivity = this.config.boxType == "board" && game.settings.get("dice-so-nice", "allowInteractivity");

			this.dicefactory.setQualitySettings(this.config);
			let globalAnimationSpeed = game.settings.get("dice-so-nice", "globalAnimationSpeed");
			if (globalAnimationSpeed === "0")
				this.speed = this.config.speed;
			else
				this.speed = parseInt(globalAnimationSpeed, 10);
			this.throwingForce = this.config.throwingForce;
			this.immersiveDarkness = this.config.immersiveDarkness;
			this.scene = new THREE.Scene();
			if (game.dice3d.dice3dRenderers[this.config.boxType] != null) {
				this.renderer = game.dice3d.dice3dRenderers[this.config.boxType];
				this.scene.environment = this.renderer.scopedTextureCache.textureCube;
				this.scene.traverse(object => {
					if (object.type === 'Mesh') object.material.needsUpdate = true;
				});
			}
			else {
				const preserveDrawingBuffer = game.user.getFlag("dice-so-nice", "preserveDrawingBuffer") || false;
				this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: preserveDrawingBuffer });
				if (this.dicefactory.useHighDPI)
					this.renderer.setPixelRatio(window.devicePixelRatio);
				if (this.dicefactory.realisticLighting) {
					this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
					this.renderer.toneMappingExposure = this.toneMappingExposureDefault;
				}
				const capabilities = this.renderer.capabilities;
				this.anisotropy = capabilities.getMaxAnisotropy() < 16 ? capabilities.getMaxAnisotropy() : 16;
				await this.loadContextScopedTextures(this.config.boxType);
				this.dicefactory.initializeMaterials();
				game.dice3d.dice3dRenderers[this.config.boxType] = this.renderer;
			}

			if (false && this.config.boxType == "board") {
				this.rendererStats = new RendererStats()

				this.rendererStats.domElement.style.position = 'absolute';
				this.rendererStats.domElement.style.left = '44px';
				this.rendererStats.domElement.style.bottom = '178px';
				this.rendererStats.domElement.style.transform = 'scale(2)';
				document.body.appendChild(this.rendererStats.domElement);
			}

			this.container.appendChild(this.renderer.domElement);
			this.renderer.shadowMap.enabled = this.dicefactory.shadows;
			this.renderer.shadowMap.type = this.dicefactory.shadowQuality == "high" ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
			this.renderer.setClearColor(0x000000, 0.0);

			this.setScene(this.config.dimensions);

			if (this.config.boxType == "board") {
				this.physicsWorker = this.dicefactory.physicsWorker;

				await this.physicsWorker.exec('init', {
					muteSoundSecretRolls: this.muteSoundSecretRolls,
					height: this.display.containerHeight,
					width: this.display.containerWidth,
				});

				this.physicsWorker.off('collide');
				this.physicsWorker.on('collide', (data) => {
					this.eventCollide(data);
				});
			}

			//this.renderer.render(this.scene, this.camera);
			resolve();
		});
	}

	loadContextScopedTextures(type) {
		return new Promise(resolve => {
			this.renderer.scopedTextureCache = { type: type };
			if (this.dicefactory.realisticLighting) {
				let textureLoader = new THREE.TextureLoader();
				this.renderer.scopedTextureCache.roughnessMap_fingerprint = textureLoader.load('modules/dice-so-nice/textures/roughnessMap_finger.webp');
				this.renderer.scopedTextureCache.roughnessMap_wood = textureLoader.load('modules/dice-so-nice/textures/roughnessMap_wood.webp');
				this.renderer.scopedTextureCache.roughnessMap_metal = textureLoader.load('modules/dice-so-nice/textures/roughnessMap_metal.webp');
				this.renderer.scopedTextureCache.roughnessMap_stone = textureLoader.load('modules/dice-so-nice/textures/roughnessMap_stone.webp');

				//set anisotropy
				this.renderer.scopedTextureCache.roughnessMap_fingerprint.anisotropy = this.anisotropy;
				this.renderer.scopedTextureCache.roughnessMap_wood.anisotropy = this.anisotropy;
				this.renderer.scopedTextureCache.roughnessMap_metal.anisotropy = this.anisotropy;
				this.renderer.scopedTextureCache.roughnessMap_stone.anisotropy = this.anisotropy;

				this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
				this.pmremGenerator.compileEquirectangularShader();

				new RGBELoader()
					.setDataType(THREE.HalfFloatType)
					.setPath('modules/dice-so-nice/textures/equirectangular/')
					.load('blouberg_sunrise_2_1k.hdr', function (texture) {
						this.renderer.scopedTextureCache.textureCube = this.pmremGenerator.fromEquirectangular(texture).texture;
						this.renderer.scopedTextureCache.textureCube.encoding = THREE.sRGBEncoding;
						this.scene.environment = this.renderer.scopedTextureCache.textureCube;
						//this.scene.background = this.renderer.scopedTextureCache.textureCube;
						texture.dispose();
						this.pmremGenerator.dispose();
						resolve();

					}.bind(this));
			} else {
				let loader = new THREE.CubeTextureLoader();
				loader.setPath('modules/dice-so-nice/textures/cubemap/');

				this.renderer.scopedTextureCache.textureCube = loader.load([
					'px.webp', 'nx.webp',
					'py.webp', 'ny.webp',
					'pz.webp', 'nz.webp'
				]);
				resolve();
			}
		});
	}

	setScene(dimensions) {
		this.display.currentWidth = this.container.clientWidth > 0 ? this.container.clientWidth : parseInt(this.container.style.width);
		this.display.currentHeight = this.container.clientHeight > 0 ? this.container.clientHeight : parseInt(this.container.style.height);

		this.display.currentWidth /= 2;
		this.display.currentHeight /= 2;

		if (dimensions) {
			this.display.containerWidth = dimensions.w;
			this.display.containerHeight = dimensions.h;

			if (!this.display.currentWidth || !this.display.currentHeight) {
				this.display.currentWidth = dimensions.w / 2;
				this.display.currentHeight = dimensions.h / 2;
			}
		} else {
			this.display.containerWidth = this.display.currentWidth;
			this.display.containerHeight = this.display.currentHeight;
		}

		this.display.aspect = Math.min(this.display.currentWidth / this.display.containerWidth, this.display.currentHeight / this.display.containerHeight);

		if (this.config.autoscale)
			this.display.scale = Math.sqrt(this.display.containerWidth * this.display.containerWidth + this.display.containerHeight * this.display.containerHeight) / 13;
		else
			this.display.scale = this.config.scale;
		if (this.config.boxType == "board")
			this.dicefactory.setScale(this.display.scale);
		this.renderer.setSize(this.display.currentWidth * 2, this.display.currentHeight * 2);

		this.cameraHeight.max = this.display.currentHeight / this.display.aspect / Math.tan(10 * Math.PI / 180);

		this.cameraHeight.medium = this.cameraHeight.max / 1.5;
		this.cameraHeight.far = this.cameraHeight.max;
		this.cameraHeight.close = this.cameraHeight.max / 2;

		if (this.camera) this.scene.remove(this.camera);
		this.camera = new THREE.PerspectiveCamera(20, this.display.currentWidth / this.display.currentHeight, 1, this.cameraHeight.max * 1.3);

		switch (this.config.boxType) {
			case "showcase":
				this.camera.position.z = this.selector.dice.length > 9 ? this.cameraHeight.far : (this.selector.dice.length < 6 ? this.cameraHeight.close : this.cameraHeight.medium);
				break;
			default:
				this.camera.position.z = this.cameraHeight.far;
		}
		this.camera.near = 10;
		this.camera.lookAt(new THREE.Vector3(0, 0, 0));

		const maxwidth = Math.max(this.display.containerWidth, this.display.containerHeight);

		if (this.light) this.scene.remove(this.light);
		if (this.light_amb) this.scene.remove(this.light_amb);

		let intensity, intensity_amb;
		if (this.dicefactory.realisticLighting) { //advanced lighting
			intensity = 1.5;
			intensity_amb = 1.0;
		} else {
			if (this.config.boxType == "board") {
				intensity = 1.2;
				intensity_amb = 1.0;
			} else {
				intensity = 1.5;
				intensity_amb = 3;
			}
		}


		this.light_amb = new THREE.HemisphereLight(this.colors.ambient, this.colors.ground, intensity_amb);
		this.scene.add(this.light_amb);

		this.light = new THREE.DirectionalLight(this.colors.spotlight, intensity);
		if (this.config.boxType == "board")
			this.light.position.set(-this.display.containerWidth / 10, this.display.containerHeight / 10, maxwidth / 2);
		else
			this.light.position.set(0, this.display.containerHeight / 10, maxwidth / 2);
		this.light.target.position.set(0, 0, 0);
		this.light.distance = 0;
		this.light.castShadow = this.dicefactory.shadows;
		this.light.shadow.camera.near = maxwidth / 10;
		this.light.shadow.camera.far = maxwidth * 5;
		this.light.shadow.camera.fov = 50;
		this.light.shadow.bias = -0.0001;
		const shadowMapSize = this.dicefactory.shadowQuality == "high" ? 2048 : 1024;
		this.light.shadow.mapSize.width = shadowMapSize;
		this.light.shadow.mapSize.height = shadowMapSize;
		const d = 1000;
		this.light.shadow.camera.left = - d;
		this.light.shadow.camera.right = d;
		this.light.shadow.camera.top = d;
		this.light.shadow.camera.bottom = - d;
		this.scene.add(this.light);

		if (this.desk)
			this.scene.remove(this.desk);

		let shadowplane = new THREE.ShadowMaterial();
		shadowplane.opacity = 0.5;
		this.desk = new THREE.Mesh(new THREE.PlaneGeometry(this.display.containerWidth * 6, this.display.containerHeight * 6, 1, 1), shadowplane);
		this.desk.receiveShadow = this.dicefactory.shadows;
		this.desk.position.set(0, 0, -1);
		this.scene.add(this.desk);
		if (this.dicefactory.realisticLighting) {
			let renderScene = new RenderPass(this.scene, this.camera);
			const canvasSize = new THREE.Vector2(this.display.currentWidth * 2, this.display.currentHeight * 2);
			this.bloomPass = new TransparentUnrealBloomPass(canvasSize, game.dice3d.uniforms.bloomStrength.value, game.dice3d.uniforms.bloomRadius.value, game.dice3d.uniforms.bloomThreshold.value);
			this.gammaPass = new ShaderPass(GammaCorrectionShader);

			// Add an outline pass for the outline sfx
			this.outlinePass = new OutlinePass(canvasSize, this.scene, this.camera);
			this.outlinePass.pulsePeriod = 1.5;

			let size = canvasSize.multiplyScalar(this.renderer.getPixelRatio());
			//Create a RenderTarget with high precision
			let options = {
				type: THREE.FloatType,
				samples: this.dicefactory.aa == "msaa" ? 4 : 0,
				anisotropy: this.anisotropy
			};
			//Workaround for a bug on Chrome on OSX
			if (navigator.userAgent.indexOf('Mac OS X') != -1 && navigator.userAgent.indexOf('Chrome') != -1) {
				options.stencilBuffer = true;
			}
			this.composerTarget = new THREE.WebGLRenderTarget(size.x, size.y, options);

			// This EffectComposer is in charge of rendering the Bloom/Glow effect
			this.bloomComposer = new EffectComposer(this.renderer, this.composerTarget);
			this.bloomComposer.renderToScreen = false;
			this.bloomComposer.addPass(renderScene);
			this.bloomComposer.addPass(this.bloomPass);

			//This shader will blend the bloom effect with the scene. Only the alpha from the bloom effect will be used.
			this.blendingPass = new ShaderPass(
				new THREE.ShaderMaterial({
					uniforms: {
						baseTexture: { value: null },
						bloomTexture: { value: this.bloomComposer.renderTarget2.texture },
					},
					vertexShader: `
						varying vec2 vUv;
						void main() {
							vUv = uv;
							gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
						}
					`,
					fragmentShader: `
						uniform sampler2D baseTexture;
						uniform sampler2D bloomTexture;
						varying vec2 vUv;
						void main() {
							vec4 base = texture2D( baseTexture, vUv );
							vec4 bloom = texture2D( bloomTexture, vUv );
							gl_FragColor = vec4(base.rgb + ( vec3( 1.0 ) * bloom.rgb ), bloom.a);
						}
					`,
					defines: {}
				}), "baseTexture"
			);
			this.blendingPass.needsSwap = true;

			// This EffectComposer is in charge of rendering the final image
			// The blendingPass won't be rendered if no emissive textures are found during the render loop
			this.finalComposer = new EffectComposer(this.renderer, this.composerTarget);
			this.finalComposer.addPass(renderScene);
			this.finalComposer.addPass(this.outlinePass);
			this.finalComposer.addPass(this.blendingPass);

			//Software Anti-aliasing pass. Should be rendered in a linear space.
			if (this.dicefactory.aa == "smaa") {
				this.AAPass = new SMAAPass(size.x, size.y);
				this.AAPass.renderToScreen = true;
				this.finalComposer.addPass(this.AAPass);
			}

			//Gamma correction pass. Convert the image to a gamma space.
			this.finalComposer.addPass(this.gammaPass);
		}
		this.renderScene();
	}

	async update(config) {
		this.showExtraDice = config.showExtraDice;
		this.muteSoundSecretRolls = config.muteSoundSecretRolls;
		if (this.config.boxType == "board") {
			if (config.autoscale) {
				this.display.scale = Math.sqrt(this.display.containerWidth * this.display.containerWidth + this.display.containerHeight * this.display.containerHeight) / 13;
			} else {
				this.display.scale = config.scale
			}
			this.dicefactory.setScale(this.display.scale);
		}
		this.dicefactory.setQualitySettings(config);

		let globalAnimationSpeed = game.settings.get("dice-so-nice", "globalAnimationSpeed");
		if (globalAnimationSpeed === "0")
			this.speed = parseInt(config.speed, 10);
		else
			this.speed = parseInt(globalAnimationSpeed, 10);

		this.light.castShadow = this.dicefactory.shadows;
		this.desk.receiveShadow = this.dicefactory.shadows;
		this.renderer.shadowMap.enabled = this.dicefactory.shadows;
		this.renderer.shadowMap.type = this.dicefactory.shadowQuality == "high" ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
		this.sounds = config.sounds;
		this.volume = config.soundsVolume;
		this.soundsSurface = config.soundsSurface;

		await this.dicefactory.preloadPresets(true, null, config.appearance);

		this.throwingForce = config.throwingForce;
		this.immersiveDarkness = config.immersiveDarkness;
		this.scene.traverse(object => {
			if (object.type === 'Mesh') object.material.needsUpdate = true;
		});
	}


	vectorRand({ x, y }) {
		let angle = Math.random() * Math.PI / 5 - Math.PI / 5 / 2;
		let vec = {
			x: x * Math.cos(angle) - y * Math.sin(angle),
			y: x * Math.sin(angle) + y * Math.cos(angle)
		};
		if (vec.x == 0) vec.x = 0.01;
		if (vec.y == 0) vec.y = 0.01;
		return vec;
	}

	//returns an array of vectordata objects
	getVectors(notationVectors, vector, boost, dist) {

		for (let i = 0; i < notationVectors.dice.length; i++) {

			const diceobj = this.dicefactory.get(notationVectors.dice[i].type);

			let vec = this.vectorRand(vector);

			vec.x /= dist;
			vec.y /= dist;

			let pos = {
				x: this.display.containerWidth * (vec.x > 0 ? -1 : 1) * 0.9 + Math.floor(Math.random() * 201) - 100,
				y: this.display.containerHeight * (vec.y > 0 ? -1 : 1) * 0.9 + Math.floor(Math.random() * 201) - 100,
				z: Math.random() * 200 + 200
			};

			let projector = Math.abs(vec.x / vec.y);
			if (projector > 1.0) pos.y /= projector; else pos.x *= projector;


			let velvec = this.vectorRand(vector);

			velvec.x /= dist;
			velvec.y /= dist;
			let velocity, angle, axis;

			if (diceobj.shape != "d2") {

				velocity = {
					x: velvec.x * boost,
					y: velvec.y * boost,
					z: -10
				};

				angle = {
					x: -(Math.random() * vec.y * 5 + diceobj.inertia * vec.y),
					y: Math.random() * vec.x * 5 + diceobj.inertia * vec.x,
					z: 0
				};

				axis = {
					x: Math.random(),
					y: Math.random(),
					z: Math.random(),
					a: Math.random()
				};

				axis = {
					x: 0,
					y: 0,
					z: 0,
					a: 0
				};
			} else {
				//coin flip
				velocity = {
					x: velvec.x * boost / 10,
					y: velvec.y * boost / 10,
					z: 3000
				};

				angle = {
					x: 12 * diceobj.inertia,//-(Math.random() * velvec.y * 50 + diceobj.inertia * velvec.y ) ,
					y: 1 * diceobj.inertia,//Math.random() * velvec.x * 50 + diceobj.inertia * velvec.x ,
					z: 0
				};

				axis = {
					x: 1,//Math.random(), 
					y: 1,//Math.random(), 
					z: Math.random(),
					a: Math.random()
				};
			}

			notationVectors.dice[i].vectors = {
				type: diceobj.type,
				pos,
				velocity,
				angle,
				axis
			};
		}
		return notationVectors;
	}

	// swaps dice faces to match desired result
	async swapDiceFace(dicemesh) {
		const diceobj = this.dicefactory.get(dicemesh.notation.type);

		let value = parseInt(await dicemesh.getValue());
		let result = parseInt(dicemesh.forcedResult);

		if (diceobj.shape == 'd10' && result == 0) result = 10;

		if (diceobj.valueMap) { //die with special values
			result = diceobj.valueMap[result];
		}

		// Make the last rolled dice and the DiceBox instance available for debugging
		//CONFIG.DiceSoNice = {
		//	dicemesh,
		//	dicebox: this
		//};

		if (value == result) return;

		let rotIndex = value > result ? result + "," + value : value + "," + result;
		//console.log(`Needed ${result}, Rolled ${value}, Remap: ${rotIndex}`)
		let rotationDegrees = DICE_MODELS[dicemesh.shape].rotationCombinations[rotIndex];
		if (!rotationDegrees) {
			console.log(`[Dice So Nice] No dice rotation found for ${dicemesh.shape} ${value} ${result}`);
			rotationDegrees = [0, 0, 0];
		}
		let eulerAngle = new THREE.Euler(THREE.MathUtils.degToRad(rotationDegrees[0]), THREE.MathUtils.degToRad(rotationDegrees[1]), THREE.MathUtils.degToRad(rotationDegrees[2]));
		let quaternion = new THREE.Quaternion().setFromEuler(eulerAngle);
		if (value > result)
			quaternion.invert();

		dicemesh.applyQuaternion(quaternion);
	}

	/*
	// Apply an euler angle from rotationCombinations for debugging
	  swapTest(dicemesh, mapping, invert = false, revert = true) {
  
		  let rotationDegrees = DICE_MODELS[dicemesh.shape].rotationCombinations[mapping];
		  let eulerAngle = new THREE.Euler(THREE.MathUtils.degToRad(rotationDegrees[0]), THREE.MathUtils.degToRad(rotationDegrees[1]), THREE.MathUtils.degToRad(rotationDegrees[2]));
		  let quaternion = new THREE.Quaternion().setFromEuler(eulerAngle);
		  if (invert)
			  quaternion.invert();
  
		  dicemesh.applyQuaternion(quaternion);
  
		  if (revert) {
			  setTimeout(() => { this.swapTest(dicemesh, mapping, !invert, false) }, 2000 )
		  }
  
		  dicemesh.resultReason = 'forced';
	  }
  
	// Apply an euler angle directly for debugging
	  swapTest(dicemesh, mapping, invert = false, revert = true) {
	  swapTestEuler(dicemesh, euler, invert = false, revert = true) {
		  let eulerAngle = new THREE.Euler(THREE.MathUtils.degToRad(euler[0]), THREE.MathUtils.degToRad(euler[1]), THREE.MathUtils.degToRad(euler[2]));
		  let quaternion = new THREE.Quaternion().setFromEuler(eulerAngle);
		  if (invert)
			  quaternion.invert();
  
		  dicemesh.applyQuaternion(quaternion);
  
		  if (revert) {
			  setTimeout(() => { this.swapTestEuler(dicemesh, euler, !invert, false) }, 2000 )
		  }
  
		  dicemesh.resultReason = 'forced';
	  }
  
	// Extract the euler angle from a mesh in degrees for debugging
	  extractEuler(dicemesh) {
		  let euler = dicemesh.rotation
		  console.log("World Euler:", THREE.MathUtils.radToDeg(euler.x), THREE.MathUtils.radToDeg(euler.y), THREE.MathUtils.radToDeg(euler.z), euler.order)
	  }
	*/

	//spawns one dicemesh object from a single vectordata object
	async spawnDice(dicedata, appearance) {
		let vectordata = dicedata.vectors;
		const diceobj = this.dicefactory.get(vectordata.type);
		if (!diceobj) return;

		let dicemesh = await this.dicefactory.create(this.renderer.scopedTextureCache, diceobj.type, appearance);
		if (!dicemesh) return;

		let mass = diceobj.mass;
		switch (appearance.material) {
			case "metal":
				mass *= 7;
				break;
			case "wood":
				mass *= 0.65;
				break;
			case "glass":
				mass *= 2;
				break;
			case "stone":
				mass *= 1.5;
				break;
		}

		dicemesh.notation = vectordata;
		dicemesh.result = null;
		dicemesh.forcedResult = dicedata.result;
		dicemesh.startAtIteration = dicedata.startAtIteration;
		dicemesh.stopped = 0;
		dicemesh.castShadow = this.dicefactory.shadows;
		dicemesh.receiveShadow = this.dicefactory.shadows;
		dicemesh.specialEffects = dicedata.specialEffects;

		// Add the dice to the physics world
		await this.physicsWorker.exec('createDice', {
			id: dicemesh.id,
			shape: diceobj.shape,
			material: appearance.material,
			vectordata: vectordata,
			mass: mass,
			startAtIteration: dicedata.startAtIteration,
			options: dicedata.options
		});

		if (dicemesh.userData.glowingInDarkness) {
			if (canvas.darknessLevel > 0.5) {
				//If the darkness level is less than 0.5, we activate the "glowing in the dark" mode
				//This mode is activated by setting the userData.glowingInDarkness to true on the mesh of the dice
				dicemesh.material.emissiveIntensity = 0.3;
				dicemesh.material.emissive = new THREE.Color(0xffffff);
			} else {
				dicemesh.material.emissiveIntensity = 0;
				dicemesh.material.emissive = new THREE.Color(0x000000);
			}
		}

		//dicemesh.meshCannon = this.body2mesh(dicemesh.body_sim,true);

		let objectContainer = new THREE.Group();
		objectContainer.add(dicemesh);

		this.diceList.push(dicemesh);
		if (dicemesh.startAtIteration == 0) {
			this.scene.add(objectContainer);
			await this.physicsWorker.exec('addDice', dicemesh.id);
		}
	}

	eventCollide({ source, diceType, diceMaterial, strength }) {
		if (!this.sounds || !this.sounds_dice.source) return;

		const sound = this.selectSound(source, diceType, diceMaterial);
		const audioSource = source === "dice" ? this.sounds_dice.source : this.sounds_table.source;
		this.playAudioSprite(audioSource, sound, strength);
	}

	generateCollisionSounds(workerCollides) {
		const detectedCollides = new Array(1000);
		if (!this.sounds || !this.sounds_dice.source) return detectedCollides;

		for (let i = 0; i < workerCollides.length; i++) {
			const collide = workerCollides[i];
			if (!collide) continue;

			const [source, diceType, diceMaterial, strength] = collide;
			const sound = this.selectSound(source, diceType, diceMaterial);
			detectedCollides[i] = [source, sound, strength];
		}

		return detectedCollides;
	}

	selectSound(source, diceType, diceMaterial) {
		let sound;

		if (source === "dice") {
			if (diceType !== "dc") {
				let sounds_dice = this.sounds_dice['plastic'];
				if (this.sounds_dice[diceMaterial]) {
					sounds_dice = this.sounds_dice[diceMaterial];
				}
				sound = sounds_dice[Math.floor(Math.random() * sounds_dice.length)];
			} else {
				sound = this.sounds_dice['coin'][Math.floor(Math.random() * this.sounds_dice['coin'].length)];
			}
		} else {
			const surface = this.soundsSurface;
			const soundlist = this.sounds_table[surface];
			sound = soundlist[Math.floor(Math.random() * soundlist.length)];
		}

		return sound;
	}


	throwFinished() {
		let stopped = true;
		if (this.iteration <= this.minIterations) return false;
		stopped = this.iteration >= this.iterationsNeeded;
		if (stopped) {
			//Can't await here because of the PIXI ticker. Hopefully it's not needed.
			this.physicsWorker.exec('cleanAfterThrow');
			if(!game.settings.get("dice-so-nice", "diceCanBeFlipped")){
				for(const dice of this.diceList) {
					dice.sim.mass = 0;
					dice.sim.dead = true;
				}
			}
		}
		return stopped;
	}

	async simulateThrow() {
		this.animstate = 'simulate';
		this.rolling = true;

		const workerData = {
			minIterations: this.minIterations,
			nbIterationsBetweenRolls: this.nbIterationsBetweenRolls,
			framerate: this.framerate,
			canBeFlipped: game.settings.get("dice-so-nice", "diceCanBeFlipped")
		}

		const { ids, quaternionsBuffers, positionsBuffers, detectedCollides, deads, iterationsNeeded } = await this.physicsWorker.exec('simulateThrow', workerData);

		const quaternions = quaternionsBuffers.map(buffer => new Float32Array(buffer));
		const positions = positionsBuffers.map(buffer => new Float32Array(buffer));

		this.iterationsNeeded = iterationsNeeded;

		// Create a mapping of IDs to their index in the 'ids' array
		const idToIndex = new Map();
		ids.forEach((id, index) => {
			idToIndex.set(id, index);
		});

		this.diceList.forEach(dice => {
			const index = idToIndex.get(dice.id);
			if (index !== undefined) {
				dice.sim = {
					dead: deads[index],
					stepQuaternions: quaternions[index],
					stepPositions: positions[index]
				}
			}
		});

		this.detectedCollides = this.generateCollisionSounds(detectedCollides);
	}



	//This is the render loop
	animateThrow() {

		let time = (new Date()).getTime();
		this.last_time = this.last_time || time - (this.framerate * 1000);
		let time_diff = (time - this.last_time) / 1000;

		let neededSteps = Math.floor(time_diff / this.framerate);

		//Update animated dice mixer
		if (this.animatedDiceDetected) {
			let delta = this.clock.getDelta();
			for (const child of this.scene.children) {
				let dicemesh = child.children && child.children.length && child.children[0].sim != undefined ? child.children[0] : null;
				if (dicemesh && dicemesh.mixer) {
					dicemesh.mixer.update(delta);
				}
			}
		}

		if (neededSteps && this.rolling) {
			for (let i = 0; i < neededSteps * this.speed; i++) {
				++this.iteration;
				if (!(this.iteration % this.nbIterationsBetweenRolls)) {
					for (let i = 0; i < this.diceList.length; i++) {
						if (this.diceList[i].startAtIteration == this.iteration) {
							this.scene.add(this.diceList[i].parent);
						}
					}
				}
			}
			if (this.iteration > this.iterationsNeeded)
				this.iteration = this.iterationsNeeded;

			for (const child of this.scene.children) {
				let dicemesh = child.children && child.children.length && child.children[0].sim != undefined && !child.children[0].sim.dead ? child.children[0] : null;

				if (dicemesh && dicemesh.sim.stepPositions[this.iteration * 3]) {
					child.position.fromArray(dicemesh.sim.stepPositions, this.iteration * 3);
					child.quaternion.fromArray(dicemesh.sim.stepQuaternions, this.iteration * 4);

					/*if (dicemesh.meshCannon) {
						dicemesh.meshCannon.position.copy(dicemesh.body_sim.stepPositions[this.iteration]);
						dicemesh.meshCannon.quaternion.copy(dicemesh.body_sim.stepQuaternions[this.iteration]);
					}*/
				}
			}

			if (this.detectedCollides[this.iteration]) {
				this.playAudioSprite(...this.detectedCollides[this.iteration]);
			}
		} else if (!this.rolling) {
			this.physicsWorker.exec('playStep', {
				time_diff: time_diff
			}).then(({ ids, quaternionsBuffers, positionsBuffers, worldAsleep}) => {
				if(worldAsleep)
					return;
				// Create a mapping of IDs to their index in the 'ids' array
				const quaternions = new Float32Array(quaternionsBuffers);
				const positions = new Float32Array(positionsBuffers);
				const idToIndex = new Map();
				ids.forEach((id, index) => {
					idToIndex.set(id, index);
				});

				for (const child of this.scene.children) {
					let dicemesh = child.children && child.children.length && child.children[0].sim != undefined && !child.children[0].sim.dead ? child.children[0] : null;
					if (dicemesh) {
						child.position.fromArray(positions, idToIndex.get(dicemesh.id) * 3);
						child.quaternion.fromArray(quaternions, idToIndex.get(dicemesh.id) * 4);

						/*if (dicemesh.meshCannon) {
							dicemesh.meshCannon.position.copy(dicemesh.body_sim.position);
							dicemesh.meshCannon.quaternion.copy(dicemesh.body_sim.quaternion);
						}*/
					}
				}
			});
		}

		if (this.isVisible && (this.allowInteractivity || this.animatedDiceDetected || neededSteps || DiceSFXManager.renderQueue.length)) {
			DiceSFXManager.renderSFX();
			//use darknessLevel to change toneMapping
			if (this.dicefactory.realisticLighting && this.immersiveDarkness) {
				//If the darkness level is not defined, we set it to 0
				let darknessLevel = canvas.darknessLevel || 0;
				this.renderer.toneMappingExposure = this.toneMappingExposureDefault * 0.4 + (this.toneMappingExposureDefault * 0.6 - darknessLevel * 0.6);
			}
			this.renderScene();
		}
		if (this.rendererStats)
			this.rendererStats.update(this.renderer);
		this.last_time = this.last_time + neededSteps * this.framerate * 1000;

		// roll finished
		if (this.throwFinished()) {
			//if animated dice still on the table, keep animating
			this.rolling = false;
			if (this.running) {
				this.handleSpecialEffectsInit().then(() => {
					this.callback(this.throws);
					this.callback = null;
					this.throws = null;
					if (!this.animatedDiceDetected && !(this.allowInteractivity && (this.deadDiceList.length + this.diceList.length) > 0) && !DiceSFXManager.renderQueue.length)
						this.removeTicker(this.animateThrow);
				});
			}
			this.running = false;
		}
	}

	async start_throw(throws, callback) {
		if (this.rolling) return;
		let countNewDice = 0;
		throws.forEach(notation => {
			let vector = { x: (Math.random() * 2 - 0.5) * this.display.currentWidth, y: -(Math.random() * 2 - 0.5) * this.display.currentHeight };
			let dist = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
			let throwingForceModifier = 0.8;
			switch (this.throwingForce) {
				case "weak":
					throwingForceModifier = 0.5;
					break;
				case "strong":
					throwingForceModifier = 1.8;
					break;
			}
			let boost = ((Math.random() + 3) * throwingForceModifier) * dist;

			notation = this.getVectors(notation, vector, boost, dist);
			countNewDice += notation.dice.length;
		});

		let maxDiceNumber = game.settings.get("dice-so-nice", "maxDiceNumber");
		if (this.deadDiceList.length + this.diceList.length + countNewDice > maxDiceNumber) {
			this.clearAll();
		}
		this.isVisible = true;
		await this.rollDice(throws, callback);
	}

	clearDice() {
		this.running = false;
		this.deadDiceList = this.deadDiceList.concat(this.diceList);
		this.diceList = [];
	}

	async clearAll() {
		this.clearDice();
		const diceToRemove = [];
		let dice;
		while (dice = this.deadDiceList.pop()) {
			this.scene.remove(dice.parent.type == "Scene" ? dice : dice.parent);
			diceToRemove.push(dice.id);
		}

		await this.physicsWorker.exec("removeDice", diceToRemove);

		if (this.pane) this.scene.remove(this.pane);

		if (this.config.boxType == "board") {
			DiceSFXManager.clearQueue();
			this.removeTicker(this.animateThrow);
		} else {
			this.removeTicker(this.animateSelector);
		}

		this.renderScene();

		this.isVisible = false;
	}

	renderScene() {
		if (this.dicefactory.realisticLighting) {
			game.dice3d.uniforms.globalBloom.value = 1;
			if (!this.finalComposer)
				return;

			//Check if there is any emissive materials before rendering the bloom pass
			let hasEmissive = false;
			let black = this.blackColor;
			this.scene.traverseVisible(function (object) {
				if (object.material && object.material.emissive != undefined && !object.material.emissive.equals(black)) {
					hasEmissive = true;
					return;
				}
			});
			if (hasEmissive && this.dicefactory.glow) {
				this.bloomComposer.render();
				this.blendingPass.enabled = true;
			} else {
				this.blendingPass.enabled = false;
			}
			game.dice3d.uniforms.globalBloom.value = 0;
			this.finalComposer.render();
		} else {
			this.renderer.render(this.scene, this.camera);
		}
	}

	clearScene() {
		while (this.scene.children.length > 0) {
			this.scene.remove(this.scene.children[0]);
		}
		this.desk.material.dispose();
		this.desk.geometry.dispose();
		if (this.composerTarget)
			this.composerTarget.dispose();
		if (this.bloomPass)
			this.bloomPass.dispose();
		if (this.AAPass)
			this.AAPass.dispose();
		if (this.bloomComposer) {
			this.bloomComposer.renderTarget1.dispose();
			this.bloomComposer.renderTarget2.dispose();
		}
		if (this.finalComposer) {
			this.finalComposer.renderTarget1.dispose();
			this.finalComposer.renderTarget2.dispose();
		}
		if (this.dicefactory.shadows) {
			this.light.shadow.map.dispose();
		}
		if (this.config.boxType == "board")
			this.removeTicker(this.animateThrow);
		else
			this.removeTicker(this.animateSelector);
	}

	//Allow to remove an handler from a PIXI ticker even when the context changed.
	removeTicker(fn) {
		let ticker = canvas.app.ticker;
		let listener = ticker._head.next;

		while (listener) {
			// We found a match, lets remove it
			// no break to delete all possible matches
			// incase a listener was added 2+ times
			if (listener.fn === fn) {
				listener = listener.destroy();
			}
			else {
				listener = listener.next;
			}
		}

		if (!ticker._head.next) {
			ticker._cancelIfNeeded();
		}
		return ticker;
	}

	async rollDice(throws, callback) {

		this.camera.position.z = this.cameraHeight.far;
		this.clearDice();
		this.minIterations = (throws.length - 1) * this.nbIterationsBetweenRolls;

		for (let j = 0; j < throws.length; j++) {
			let notationVectors = throws[j];

			for (let i = 0, len = notationVectors.dice.length; i < len; ++i) {
				notationVectors.dice[i].startAtIteration = j * this.nbIterationsBetweenRolls;
				let appearance = this.dicefactory.getAppearanceForDice(notationVectors.dsnConfig.appearance, notationVectors.dice[i].type, notationVectors.dice[i]);
				await this.spawnDice(notationVectors.dice[i], appearance);
			}
		}

		await this.simulateThrow();
		this.iteration = 0;


		//check forced results, fix dice faces if necessary
		//Detect if there's an animated dice
		this.animatedDiceDetected = false;
		for (let i = 0, len = this.diceList.length; i < len; ++i) {
			let dicemesh = this.diceList[i];
			if (!dicemesh) continue;
			await this.swapDiceFace(dicemesh);
			if (dicemesh.mixer)
				this.animatedDiceDetected = true;
		}

		//reset the result
		for (let i = 0, len = this.diceList.length; i < len; ++i) {
			if (!this.diceList[i]) continue;
			this.diceList[i].result = null;

		}

		// animate the previously simulated roll
		this.rolling = true;
		this.running = (new Date()).getTime();
		this.last_time = 0;
		this.callback = callback;
		this.throws = throws;
		this.removeTicker(this.animateThrow);
		canvas.app.ticker.add(this.animateThrow, this);
	}

	async showcase(config) {
		this.clearAll();

		let selectordice = this.dicefactory.systems.standard.dice.map(dice => dice.type);
		const extraDiceTypes = ["d3", "d5", "d7", "d14", "d16", "d24", "d30"];
		if (!this.showExtraDice)
			selectordice = selectordice.filter((die) => !extraDiceTypes.includes(die));

		let proportion = this.display.containerWidth / this.display.containerHeight;
		let columns = Math.min(selectordice.length, Math.round(Math.sqrt(proportion * selectordice.length)));
		let rows = Math.floor((selectordice.length + columns - 1) / columns);

		this.camera.position.z = this.cameraHeight.medium;
		this.camera.position.x = this.display.containerWidth / 2 - (this.display.containerWidth / columns / 2);
		this.camera.position.y = -this.display.containerHeight / 2 + (this.display.containerHeight / rows / 2);
		this.camera.fov = 2 * Math.atan(this.display.containerHeight / (2 * this.camera.position.z)) * (180 / Math.PI);
		this.camera.updateProjectionMatrix();

		if (this.pane) this.scene.remove(this.pane);
		if (this.desk) this.scene.remove(this.desk);
		if (this.dicefactory.shadows) {

			let shadowplane = new THREE.ShadowMaterial();
			shadowplane.opacity = 0.5;

			this.pane = new THREE.Mesh(new THREE.PlaneGeometry(this.display.containerWidth * 2, this.display.containerHeight * 2, 1, 1), shadowplane);
			this.pane.receiveShadow = this.dicefactory.shadows;
			this.pane.position.set(0, 0, -70);
			this.scene.add(this.pane);
		}

		let z = 0;
		let count = 0;
		for (let y = 0; y < rows; y++) {
			for (let x = 0; x < columns; x++) {
				if (count >= selectordice.length)
					break;
				let appearance = this.dicefactory.getAppearanceForDice(config.appearance, selectordice[count]);
				let dicemesh = await this.dicefactory.create(this.renderer.scopedTextureCache, selectordice[count], appearance);
				dicemesh.scale.set(
					Math.min(dicemesh.scale.x * 5 / columns, dicemesh.scale.x * 2 / rows),
					Math.min(dicemesh.scale.y * 5 / columns, dicemesh.scale.y * 2 / rows),
					Math.min(dicemesh.scale.z * 5 / columns, dicemesh.scale.z * 2 / rows)
				);

				dicemesh.position.set(x * this.display.containerWidth / columns, -(y * this.display.containerHeight / rows), z);

				dicemesh.castShadow = this.dicefactory.shadows;

				dicemesh.userData = selectordice[count];

				this.diceList.push(dicemesh);
				this.scene.add(dicemesh);
				count++;
			}
		}

		this.last_time = 0;
		if (this.selector.animate) {
			this.container.style.opacity = 0;
			this.last_time = window.performance.now();
			this.start_time = this.last_time;
			this.framerate = 1000 / 60;
			this.removeTicker(this.animateSelector);
			canvas.app.ticker.add(this.animateSelector, this);
		}
		else this.renderScene();
		setTimeout(() => {
			this.scene.traverse(object => {
				if (object.type === 'Mesh') object.material.needsUpdate = true;
			});
		}, 2000);
	}

	animateSelector() {
		let now = window.performance.now();
		let elapsed = now - this.last_time;
		if (elapsed > this.framerate) {
			this.last_time = now - (elapsed % this.framerate);

			if (this.container.style.opacity != '1') this.container.style.opacity = Math.min(1, (parseFloat(this.container.style.opacity) + 0.05));

			if (this.selector.rotate) {
				let angle_change = 0.005 * Math.PI;
				for (let i = 0; i < this.diceList.length; i++) {
					this.diceList[i].rotation.y += angle_change;
					this.diceList[i].rotation.x += angle_change / 4;
					this.diceList[i].rotation.z += angle_change / 10;
				}
			}
			this.renderScene();
		}
	}

	//used to debug cannon shape vs three shape
	/*body2mesh(body) {
		var obj = new THREE.Object3D();
		let currentMaterial = new THREE.MeshBasicMaterial({ wireframe: true });
		for (var l = 0; l < body.shapes.length; l++) {
			var shape = body.shapes[l];

			var mesh;

			switch (shape.type) {

				case CANNON.Shape.types.SPHERE:
					var sphere_geometry = new THREE.SphereGeometry(shape.radius, 8, 8);
					mesh = new THREE.Mesh(sphere_geometry, currentMaterial);
					break;

				case CANNON.Shape.types.CYLINDER:
					var geometry = new THREE.CylinderGeometry(shape.radiusTop, shape.radiusBottom, shape.height, 8, 1);
					mesh = new THREE.Mesh(geometry, currentMaterial);
					break;

				case CANNON.Shape.types.PARTICLE:
					mesh = new THREE.Mesh(this.particleGeo, this.particleMaterial);
					var s = this.settings;
					mesh.scale.set(s.particleSize, s.particleSize, s.particleSize);
					break;

				case CANNON.Shape.types.PLANE:
					var geometry = new THREE.PlaneGeometry(10, 10, 4, 4);
					mesh = new THREE.Object3D();
					var submesh = new THREE.Object3D();
					var ground = new THREE.Mesh(geometry, currentMaterial);
					ground.scale.set(100, 100, 100);
					submesh.add(ground);

					ground.castShadow = true;
					ground.receiveShadow = true;

					mesh.add(submesh);
					break;

				case CANNON.Shape.types.BOX:
					var box_geometry = new THREE.BoxGeometry(shape.halfExtents.x * 2,
						shape.halfExtents.y * 2,
						shape.halfExtents.z * 2);
					mesh = new THREE.Mesh(box_geometry, currentMaterial);
					break;

				case CANNON.Shape.types.CONVEXPOLYHEDRON:
					var geo = new THREE.BufferGeometry()
					var points = []
					for (var i = 0; i < shape.faces.length; i++) {
						var face = shape.faces[i];

						for (var j = 0; j < face.length - 1; j++) {
							var a = shape.vertices[face[j]];
							var b = shape.vertices[face[j + 1]];
							points.push(a);
							points.push(b);
						}
					}
					geo.setFromPoints(points);
					geo.computeVertexNormals();
					mesh = new THREE.Mesh(geo, currentMaterial);
					break;

				default:
					throw "Visual type not recognized: " + shape.type;
			}

			//mesh.receiveShadow = this.dicefactory.shadows;
			mesh.castShadow = this.dicefactory.shadows;
			if (mesh.children) {
				for (var i = 0; i < mesh.children.length; i++) {
					mesh.children[i].castShadow = true;
					mesh.children[i].receiveShadow = true;
					if (mesh.children[i]) {
						for (var j = 0; j < mesh.children[i].length; j++) {
							mesh.children[i].children[j].castShadow = true;
							mesh.children[i].children[j].receiveShadow = true;
						}
					}
				}
			}

			var o = body.shapeOffsets[l];
			var q = body.shapeOrientations[l];
			mesh.position.set(o.x, o.y, o.z);
			mesh.quaternion.set(q.x, q.y, q.z, q.w);

			obj.add(mesh);
		}

		return obj;
	}*/

	findRootObject(object) {
		if (object.hasOwnProperty("shape"))
			return object;
		else if (object.parent)
			return this.findRootObject(object.parent);
		else
			return null;
	}

	findShowcaseDie(pos) {
		this.raycaster.setFromCamera(pos, this.camera);
		const intersects = this.raycaster.intersectObjects([...this.diceList, ...this.deadDiceList], true);
		if (intersects.length) {

			return intersects[0];
		}
		else
			return null;
	}

	findHoveredDie() {
		if (this.isVisible && !this.running && !this.mouse.constraintDown) {
			this.raycaster.setFromCamera(this.mouse.pos, this.camera);
			const intersects = this.raycaster.intersectObjects([...this.diceList, ...this.deadDiceList], true);
			if (intersects.length) {
				this.hoveredDie = intersects[0];
			}
			else
				this.hoveredDie = null;
		}
	}

	async onMouseMove(event, ndc) {
		this.mouse.pos.x = ndc.x;
		this.mouse.pos.y = ndc.y;

		if (this.mouse.constraint) {
			this.raycaster.setFromCamera(this.mouse.pos, this.camera);
			const intersects = this.raycaster.intersectObjects([this.desk]);
			if (intersects.length) {
				let pos = intersects[0].point;
				await this.physicsWorker.exec("updateConstraint", pos);
			}
		}
	}

	async onMouseDown(event, ndc) {
		this.mouse.pos.x = ndc.x;
		this.mouse.pos.y = ndc.y;
		this.hoveredDie = null;
		this.findHoveredDie();

		let entity = this.hoveredDie;
		if (!entity)
			return;
		let pos = entity.point;
		if (pos) {
			this.mouse.constraintDown = true;
			//disable FVTT mouse events
			event.stopPropagation();
			event.preventDefault();
			if (canvas.mouseInteractionManager)
				canvas.mouseInteractionManager.object.interactive = false;

			// Vector to the clicked point, relative to the body
			let root = this.findRootObject(entity.object);

			try {
				await this.physicsWorker.exec("addConstraint", { id: root.id, pos: pos });
				this.mouse.constraint = true;
				return true;
			} catch (error) {
				console.error(error);
			}
		}
		return false;
	}

	async onMouseUp(event) {
		if (this.mouse.constraintDown) {
			this.mouse.constraintDown = false;
			this.mouse.constraint = false;

			await this.physicsWorker.exec("removeConstraint");

			//re-enable fvtt canvas events
			if (canvas.mouseInteractionManager)
				canvas.mouseInteractionManager.activate();
			return true;
		}
		return false;
	}

	async handleSpecialEffectsInit() {
		let promisesSFX = [];
		this.diceList.forEach(dice => {
			if (dice.specialEffects) {
				dice.specialEffects.forEach(sfx => {
					promisesSFX.push(DiceSFXManager.playSFX(sfx, this, dice));
				});
			}
		});
		return Promise.all(promisesSFX);
	}
}
