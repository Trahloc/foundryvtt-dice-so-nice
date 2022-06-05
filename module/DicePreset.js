
import { ThinFilmFresnelMap } from './libs/ThinFilmFresnelMap.js';
import { ShaderUtils } from './ShaderUtils';
export class DicePreset {

	constructor(type, shape = '') {

		shape = shape || type;

		this.type = type;
		this.term = 'Die';
		this.shape = shape || type;
		this.scale = 1;
		this.labels = [];
		this.valueMap = null;
		this.values = [];
		this.bumps = [];
		this.emissiveMaps = [];
		this.emissive = 0x000000;
		this.mass = 300;
		this.inertia = 13;
		this.geometry = null;
		this.model = null;
		this.system = 'standard';
		this.modelLoaded = false;
		this.modelLoading = false;
		this.modelFile = null;
		this.internalAdd = false;

		//todo : check if this is useful
		this.appearance = {
			labelColor: "#FFFFFF",
			diceColor: "#000000",
			outlineColor: "#000000",
			edgeColor: "#000000",
			texture: "none",
			material: "auto",
			font: "auto",
			colorset: "custom"
		};
	}

	setValues(min = 1, max = 20, step = 1) {
		this.values = this.range(min, max, step);
		if(min < 1)
			this.setValueMap(min, max, step);
	}

	setValueMap(min, max, step) {
		let map = {};
		let count=1;
		for(let i = min; i<= max; i+=step){
			map[i] = count;
			count++;
		}
		this.valueMap = map;
	}

	registerFaces(faces, type = "labels") {
		let tab = [];
		
		tab.push('');
		if (!["d2", "d10"].includes(this.shape)) tab.push('');

		if (this.shape == 'd4') {

			let a = faces[0];
			let b = faces[1];
			let c = faces[2];
			let d = faces[3];

			tab = [
				[[], [0, 0, 0], [b, d, c], [a, c, d], [b, a, d], [a, b, c]],
				[[], [0, 0, 0], [b, c, d], [c, a, d], [b, d, a], [c, b, a]],
				[[], [0, 0, 0], [d, c, b], [c, d, a], [d, b, a], [c, a, b]],
				[[], [0, 0, 0], [d, b, c], [a, d, c], [d, a, b], [a, c, b]]
			];
		} else {
			Array.prototype.push.apply(tab, faces)
		}

		switch(type){
			case "labels":
				this.labels = tab;
				break;
			case "bumps":
				this.bumps = tab;
				break;
			case "emissive":
				this.emissiveMaps = tab;
				break;
		}
	}

	setLabels(labels) {
		this.labels = labels;
		this.modelLoaded=false;
		this.modelLoading=false;
	}

	setBumpMaps(bumps) {
		this.bumps = bumps;
		this.modelLoaded=false;
		this.modelLoading=false;
	}

	setEmissiveMaps(emissiveMaps) {
		this.emissiveMaps = emissiveMaps;
		this.modelLoaded=false;
		this.modelLoading=false;
	}

	loadTextures() {
		if(!this.modelLoaded && this.modelLoading === false){
			this.modelLoading = new Promise((resolve,reject)=> {
				let textures;
				let type;
				let textureTypeLoaded = 0;
				for(let i = 0; i < 3;i++){
					switch(i){
						case 0:
							textures = this.labels;
							type = "labels";
							break;
						case 1:
							textures = this.bumps;
							type = "bumps";
							break;
						case 2:
							textures = this.emissiveMaps;
							type = "emissive";
							break;
					}
					let loadedImages = 0;
					let numImages = textures.length;
					let regexTexture = /\.(PNG|JPG|GIF|WEBP)$/i;
					let imgElements = Array(textures.length);
					let hasTextures = false;
					for (let i = 0; i < numImages; i++) {
						if (textures[i] == null || textures[i] == '' || !textures[i].match(regexTexture)) {
							imgElements[i] = textures[i];
							++loadedImages
							continue;
						}
						hasTextures = true;
						imgElements[i] = new Image();
						imgElements[i].crossOrigin = "Anonymous";
						imgElements.textureType = type;
						imgElements[i].onload = function(){
							if (++loadedImages >= numImages) {
								this.registerFaces(imgElements, imgElements.textureType);
								if(textureTypeLoaded < 2)
									textureTypeLoaded++;
								else{
									resolve();
									this.modelLoaded = true;
								}
							}
						}.bind(this);

						//We still consider the image as loaded even if it fails to load
						//so that we can still initialize the module
						imgElements[i].onerror = function(texture){
							console.error("[Dice So Nice] Error loading texture:" + texture);
							if (++loadedImages >= numImages) {
								if(textureTypeLoaded < 2)
									textureTypeLoaded++;
								else{
									resolve();
									this.modelLoaded = true;
								}
							}
						}.bind(this, textures[i]);

						imgElements[i].src = textures[i];
					}
					if (!hasTextures){
						this.registerFaces(imgElements, type);
						if(textureTypeLoaded < 2)
							textureTypeLoaded++;
						else{
							resolve();
							this.modelLoaded = true;
						}
					}
				}
			});
		}
		return this.modelLoading;
	}

	range(start, stop, step = 1) {
		var a = [start], b = start;
		while (b < stop) {
			a.push(b += step || 1);
		}
		return a;
	}

	setModel(file) {
		this.modelFile = file;
		this.modelLoaded = false;
	}

	loadModel(loader = null) {
		// Load a glTF resource
		if(!this.modelLoaded && this.modelLoading === false){
			this.modelLoading = new Promise((resolve,reject)=> {
				loader.load(this.modelFile, gltf => {
					gltf.scene.traverse(function (node) {
						if (node.isMesh) {
							node.castShadow = true; 
							node.material.onBeforeCompile = ShaderUtils.applyDiceSoNiceShader;
							
							if(node.material.map !== null)
								node.material.map.anisotropy = 8;
							
							if(node.material.normalMap !== null)
								node.material.normalMap.anisotropy = 8;
							
							if(node.material.emissiveMap !== null)
								node.material.emissiveMap.anisotropy = 8;

							if(node.material.roughnessMap !== null)
								node.material.roughnessMap.anisotropy = 8;

							if(node.material.metalnessMap !== null)
								node.material.metalnessMap.anisotropy = 8;
						}
					});
					this.model = gltf;
					this.modelLoaded = true;
					resolve(gltf);
				});
			});
		}
		return this.modelLoading;
	}
}