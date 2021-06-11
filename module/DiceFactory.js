import {DicePreset} from './DicePreset.js';
import {DiceColors, DICE_SCALE} from './DiceColors.js';
import {DICE_MODELS} from './DiceModels.js';
import * as THREE from './libs/three.module.js';
import { GLTFLoader } from './libs/three-modules/GLTFLoader.js';
export class DiceFactory {

	constructor() {
		//Contains the dice set
		this.dice = {};
		this.geometries = {};

		this.baseScale = 50;

		this.systemForced = false;
		this.systemActivated = "standard";
		this.systemsHaveExclusive = false;

		this.cache_hits = 0;
		this.cache_misses = 0;

		this.bumpMapping = true;

		this.loaderGLTF = new GLTFLoader();

		this.baseTextureCache = {};
		this.fontFamilies = [
			"Arial",
			"Verdana",
			"Trebuchet MS",
			"Times New Roman",
			"Didot",
			"American Typewriter",
			"Andale Mono",
			"Courier",
			"Bradley Hand",
			"Luminari"
		];

		// fixes texture rotations on specific dice models
		this.rotate = {
			d8: {even: 7.5, odd: 127.5},
			d12: {all: -5},
			d20: {all: 8.5},
		};

		this.systems = {
			'standard': {id: 'standard', name: game.i18n.localize("DICESONICE.System.Standard"), dice:[], mode:"default"},
			'spectrum': {id: 'spectrum', name: game.i18n.localize("DICESONICE.System.SpectrumDice"), dice:[], mode:"default"},
			'foundry_vtt': {id: 'foundry_vtt', name: game.i18n.localize("DICESONICE.System.FoundryVTT"), dice:[], mode:"default"},
			'dot': {id: 'dot', name: game.i18n.localize("DICESONICE.System.Dot"), dice:[], mode:"default"},
			'dot_b': {id: 'dot_b', name: game.i18n.localize("DICESONICE.System.DotBlack"), dice:[], mode:"default"}
		};
		let diceobj;
		diceobj = new DicePreset('d2');
		diceobj.name = 'd2';
		diceobj.setLabels(['1','2']);
		diceobj.setValues(1,2);
		diceobj.inertia = 8;
		diceobj.mass = 400;
		diceobj.scale = 0.9;
		this.register(diceobj);
		
		diceobj = new DicePreset('dc','d2');
		diceobj.name = 'Coin';
		diceobj.setLabels([
			'modules/dice-so-nice/textures/coin/tail.webp',
			'modules/dice-so-nice/textures/coin/heads.webp'
		]);
		diceobj.setBumpMaps([
			'modules/dice-so-nice/textures/coin/tail_bump.webp',
			'modules/dice-so-nice/textures/coin/heads_bump.webp'
		]);
		diceobj.setValues(0,1);
		diceobj.inertia = 8;
		diceobj.scale = 0.9;
		diceobj.colorset = "coin_default"
		this.register(diceobj);

		diceobj = new DicePreset('d4');
		diceobj.name = 'd4';
		diceobj.setLabels(['1','2','3','4']);
		diceobj.setValues(1,4);
		diceobj.inertia = 5;
		diceobj.scale = 1.2;
		this.register(diceobj);

		diceobj = new DicePreset('d6');
		diceobj.name = 'd6';
		diceobj.setLabels(['1', '2', '3', '4', '5', '6']);
		diceobj.setValues(1,6);
		diceobj.scale = 0.9;
		this.register(diceobj);

		diceobj = new DicePreset('d3', 'd6');
		diceobj.name = 'd3';
		diceobj.setLabels(['1', '2', '3', '1', '2', '3']);
		diceobj.setValues(1,3);
		diceobj.scale = 0.9;
		this.register(diceobj);

		diceobj = new DicePreset('df', 'd6');
		diceobj.name = 'Fate Dice';
		diceobj.setLabels(['−', ' ', '+']);
		diceobj.setValues(-1,1);
		diceobj.scale = 0.9;
		this.register(diceobj);

		diceobj = new DicePreset('d8');
		diceobj.name = 'd8';
		diceobj.setLabels(['1','2','3','4','5','6','7','8']);
		diceobj.setValues(1,8);
		this.register(diceobj);

		diceobj = new DicePreset('d10');
		diceobj.name = 'd10';
		diceobj.setLabels(['1','2','3','4','5','6','7','8','9','0']);
		diceobj.setValues(1,10);
		diceobj.mass = 450;
		diceobj.inertia = 9;
		diceobj.scale = 0.9;
		this.register(diceobj);

		diceobj = new DicePreset('d5','d10');
		diceobj.name = 'd5';
		diceobj.setLabels(['1','2','3','4','5','1','2','3','4','5']);
		diceobj.setValues(1,5);
		diceobj.mass = 450;
		diceobj.inertia = 9;
		diceobj.scale = 0.9;
		this.register(diceobj);

		diceobj = new DicePreset('d100', 'd10');
		diceobj.name = 'd100';
		diceobj.setLabels(['10', '20', '30', '40', '50', '60', '70', '80', '90', '00']);
		diceobj.setValues(10, 100, 10);
		diceobj.mass = 450;
		diceobj.inertia = 9;
		diceobj.scale = 0.9;
		this.register(diceobj);

		diceobj = new DicePreset('d12');
		diceobj.name = 'd12';
		diceobj.setLabels(['1','2','3','4','5','6','7','8','9','10','11','12']);
		diceobj.setValues(1,12);
		diceobj.mass = 450;
		diceobj.inertia = 8;
		diceobj.scale = 0.9;
		this.register(diceobj);

		diceobj = new DicePreset('d20');
		diceobj.name = 'd20';
		diceobj.setLabels(['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20']);
		diceobj.setValues(1,20);
		diceobj.mass = 500;
		diceobj.scale = 1;
		diceobj.inertia = 6;
		this.register(diceobj);

		diceobj = new DicePreset('d6');
		diceobj.name = 'd6';
		diceobj.setLabels([
			'modules/dice-so-nice/textures/dot/d6-1.webp',
			'modules/dice-so-nice/textures/dot/d6-2.webp',
			'modules/dice-so-nice/textures/dot/d6-3.webp',
			'modules/dice-so-nice/textures/dot/d6-4.webp',
			'modules/dice-so-nice/textures/dot/d6-5.webp',
			'modules/dice-so-nice/textures/dot/d6-6.webp',
		]);
		diceobj.setBumpMaps([
			'modules/dice-so-nice/textures/dot/d6-1-b.webp',
			'modules/dice-so-nice/textures/dot/d6-2-b.webp',
			'modules/dice-so-nice/textures/dot/d6-3-b.webp',
			'modules/dice-so-nice/textures/dot/d6-4-b.webp',
			'modules/dice-so-nice/textures/dot/d6-5-b.webp',
			'modules/dice-so-nice/textures/dot/d6-6-b.webp',
		]);
		diceobj.setValues(1,6);
		diceobj.scale = 0.9;
		diceobj.system = "dot";
		this.register(diceobj);

		diceobj = new DicePreset('d6');
		diceobj.name = 'd6';
		diceobj.setLabels([
			'modules/dice-so-nice/textures/dot/d6-1-black.webp',
			'modules/dice-so-nice/textures/dot/d6-2-black.webp',
			'modules/dice-so-nice/textures/dot/d6-3-black.webp',
			'modules/dice-so-nice/textures/dot/d6-4-black.webp',
			'modules/dice-so-nice/textures/dot/d6-5-black.webp',
			'modules/dice-so-nice/textures/dot/d6-6-black.webp',
		]);
		diceobj.setBumpMaps([
			'modules/dice-so-nice/textures/dot/d6-1-b.webp',
			'modules/dice-so-nice/textures/dot/d6-2-b.webp',
			'modules/dice-so-nice/textures/dot/d6-3-b.webp',
			'modules/dice-so-nice/textures/dot/d6-4-b.webp',
			'modules/dice-so-nice/textures/dot/d6-5-b.webp',
			'modules/dice-so-nice/textures/dot/d6-6-b.webp',
		]);
		diceobj.setValues(1,6);
		diceobj.scale = 0.9;
		diceobj.system = "dot_b";
		this.register(diceobj);

		diceobj = new DicePreset('d20');
		diceobj.name = 'd20';
		diceobj.setLabels(['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','modules/dice-so-nice/textures/foundry_vtt/foundrynat20.webp']);
		diceobj.setBumpMaps([,,,,,,,,,,,,,,,,,,,'modules/dice-so-nice/textures/foundry_vtt/foundrynat20_bump.webp']);
		diceobj.setValues(1,20);
		diceobj.mass = 500;
		diceobj.scale = 1;
		diceobj.font = "Arial Black";
		diceobj.fontScale = 0.8;
		diceobj.inertia = 6;
		diceobj.system = "foundry_vtt";
		this.register(diceobj);

		//Spectrum Dice

		this.addDicePreset({
			type:"df",
			labels:[
				'modules/dice-so-nice/textures/spectrumdice/df-m.webp',
				'modules/dice-so-nice/textures/spectrumdice/df-0.webp',
				'modules/dice-so-nice/textures/spectrumdice/df-p.webp'
			],
			system:"spectrum"
		});

		this.addDicePreset({
			type:"d2",
			labels:[
				'modules/dice-so-nice/textures/spectrumdice/d2-1.webp',
				'modules/dice-so-nice/textures/spectrumdice/d2-2.webp'
			],
			system:"spectrum"
		});

		this.addDicePreset({
			type:"dc",
			labels:[
				'modules/dice-so-nice/textures/spectrumdice/dc-h.webp',
				'modules/dice-so-nice/textures/spectrumdice/dc-t.webp'
			],
			system:"spectrum"
		});

		this.addDicePreset({
			type:"d4",
			labels:[
				'modules/dice-so-nice/textures/spectrumdice/d4-1.webp',
				'modules/dice-so-nice/textures/spectrumdice/d4-2.webp',
				'modules/dice-so-nice/textures/spectrumdice/d4-3.webp',
				'modules/dice-so-nice/textures/spectrumdice/d4-4.webp'
			],
			system:"spectrum"
		});

		this.addDicePreset({
			type:"d6",
			labels:[
				'modules/dice-so-nice/textures/spectrumdice/d6-1.webp',
				'modules/dice-so-nice/textures/spectrumdice/d6-2.webp',
				'modules/dice-so-nice/textures/spectrumdice/d6-3.webp',
				'modules/dice-so-nice/textures/spectrumdice/d6-4.webp',
				'modules/dice-so-nice/textures/spectrumdice/d6-5.webp',
				'modules/dice-so-nice/textures/spectrumdice/d6-6.webp'
			],
			system:"spectrum"
		});

		this.addDicePreset({
			type:"d8",
			labels:[
				'modules/dice-so-nice/textures/spectrumdice/d8-1.webp',
				'modules/dice-so-nice/textures/spectrumdice/d8-2.webp',
				'modules/dice-so-nice/textures/spectrumdice/d8-3.webp',
				'modules/dice-so-nice/textures/spectrumdice/d8-4.webp',
				'modules/dice-so-nice/textures/spectrumdice/d8-5.webp',
				'modules/dice-so-nice/textures/spectrumdice/d8-6.webp',
				'modules/dice-so-nice/textures/spectrumdice/d8-7.webp',
				'modules/dice-so-nice/textures/spectrumdice/d8-8.webp'
			],
			system:"spectrum"
		});

		this.addDicePreset({
			type:"d10",
			labels:[
				'modules/dice-so-nice/textures/spectrumdice/d10-1.webp',
				'modules/dice-so-nice/textures/spectrumdice/d10-2.webp',
				'modules/dice-so-nice/textures/spectrumdice/d10-3.webp',
				'modules/dice-so-nice/textures/spectrumdice/d10-4.webp',
				'modules/dice-so-nice/textures/spectrumdice/d10-5.webp',
				'modules/dice-so-nice/textures/spectrumdice/d10-6.webp',
				'modules/dice-so-nice/textures/spectrumdice/d10-7.webp',
				'modules/dice-so-nice/textures/spectrumdice/d10-8.webp',
				'modules/dice-so-nice/textures/spectrumdice/d10-9.webp',
				'modules/dice-so-nice/textures/spectrumdice/d10-0.webp'
			],
			system:"spectrum"
		});

		this.addDicePreset({
			type:"d12",
			labels:[
				'modules/dice-so-nice/textures/spectrumdice/d12-1.webp',
				'modules/dice-so-nice/textures/spectrumdice/d12-2.webp',
				'modules/dice-so-nice/textures/spectrumdice/d12-3.webp',
				'modules/dice-so-nice/textures/spectrumdice/d12-4.webp',
				'modules/dice-so-nice/textures/spectrumdice/d12-5.webp',
				'modules/dice-so-nice/textures/spectrumdice/d12-6.webp',
				'modules/dice-so-nice/textures/spectrumdice/d12-7.webp',
				'modules/dice-so-nice/textures/spectrumdice/d12-8.webp',
				'modules/dice-so-nice/textures/spectrumdice/d12-9.webp',
				'modules/dice-so-nice/textures/spectrumdice/d12-10.webp',
				'modules/dice-so-nice/textures/spectrumdice/d12-11.webp',
				'modules/dice-so-nice/textures/spectrumdice/d12-12.webp'
			],
			system:"spectrum"
		});

		this.addDicePreset({
			type:"d100",
			labels:[
				'modules/dice-so-nice/textures/spectrumdice/d100-10.webp',
				'modules/dice-so-nice/textures/spectrumdice/d100-20.webp',
				'modules/dice-so-nice/textures/spectrumdice/d100-30.webp',
				'modules/dice-so-nice/textures/spectrumdice/d100-40.webp',
				'modules/dice-so-nice/textures/spectrumdice/d100-50.webp',
				'modules/dice-so-nice/textures/spectrumdice/d100-60.webp',
				'modules/dice-so-nice/textures/spectrumdice/d100-70.webp',
				'modules/dice-so-nice/textures/spectrumdice/d100-80.webp',
				'modules/dice-so-nice/textures/spectrumdice/d100-90.webp',
				'modules/dice-so-nice/textures/spectrumdice/d100-00.webp'
			],
			system:"spectrum"
		});

		this.addDicePreset({
			type:"d20",
			labels:[
				'modules/dice-so-nice/textures/spectrumdice/d20-1.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-2.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-3.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-4.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-5.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-6.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-7.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-8.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-9.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-10.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-11.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-12.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-13.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-14.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-15.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-16.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-17.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-18.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-19.webp',
				'modules/dice-so-nice/textures/spectrumdice/d20-20.webp'
			],
			system:"spectrum"
		});

		for(let i in CONFIG.Dice.terms){
			let term = CONFIG.Dice.terms[i];
			//If this is not a core dice type
			if(![Coin, FateDie, Die].includes(term)){
				let objTerm = new term({});
				if([3, 4, 6, 8, 10, 12, 20].includes(objTerm.faces)){
					this.internalAddDicePreset(objTerm);
				}
			}
		}
	}

	initializeMaterials(){
		if(this.bumpMapping){
			this.material_options = {
				'plastic': {
					'type':"standard",
					'options':{
						metalness: 0,
						roughness: 0.6,
						envMapIntensity:0.8
					},
					'scopedOptions':{
						roughnessMap : "roughnessMap_fingerprint",
						envMap : true
					}
				},
				'metal': {
					'type':'standard',
					'options': {
						roughness: 1,
						metalness: 1
					},
					'scopedOptions':{
						roughnessMap : "roughnessMap_metal",
						envMap : true
					}
				},
				'wood': {
					'type':'standard',
					'options': {
						roughness:1,
						metalness:0
					},
					'scopedOptions':{
						roughnessMap : "roughnessMap_wood",
						envMap : true
					}
				},
				'glass': {
					'type':'standard',
					'options': {
						roughness: 0.3,
						metalness: 0
					},
					'scopedOptions':{
						roughnessMap : "roughnessMap_fingerprint",
						envMap : true
					}
				},
				'chrome': {
					'type':'standard',
					'options': {
						metalness: 1,
						roughness: 0.1
					},
					'scopedOptions':{
						roughnessMap : "roughnessMap_fingerprint",
						envMap : true
					}
				}
			}
		} else {
			this.material_options = {
				'plastic': {
					'type':"phong",
					'options':{
						specular: 0xffffff,
						color: 0xb5b5b5,
						shininess: 3,
						flatShading: true
					}
				},
				'metal': {
					'type':'standard',
					'options': {
						color: 0xdddddd,
						emissive:0x111111,
						roughness: 0.45,
						metalness: 0.8,
						envMapIntensity:2
					}
				},
				'wood': {
					'type':'phong',
					'options': {
						specular: 0xffffff,
						color: 0xb5b5b5,
						shininess: 1,
						flatShading: true
					}
				},
				'glass': {
					'type':'phong',
					'options': {
						specular: 0xffffff,
						color: 0xb5b5b5,
						shininess: 0.3,
						reflectivity:0.1,
						combine:THREE.MixOperation
					},
					'scopedOptions':{
						envMap:true
					}
				},
				'chrome': {
					'type':'phong',
					'options': {
						specular: 0xffffff,
						color: 0xb5b5b5,
						shininess: 1,
						reflectivity:0.7,
						combine:THREE.AddOperation
					},
					'scopedOptions':{
						envMap:true
					}
				}
			}
		}
	}

	setScale(scale){
		this.baseScale = scale;
	}

	setBumpMapping(bumpMapping){
		this.bumpMapping = bumpMapping;
	}

	register(diceobj) {
		if(diceobj.system == "standard")
			this.dice[diceobj.type] = diceobj;
		this.systems[diceobj.system].dice.push(diceobj);

		let activatedSystems = [];
        game.users.forEach((user) => {
			let userSystem = null;
			if(user.getFlag("dice-so-nice", "appearance"))
            	userSystem = user.getFlag("dice-so-nice", "appearance").system;
            if(userSystem)
				activatedSystems.push(userSystem);
        });
        //remove duplicate
        activatedSystems = activatedSystems.filter((v, i, a) => a.indexOf(v) === i);

		if((diceobj.system == this.systemActivated || activatedSystems.includes(diceobj.system)) && diceobj.modelFile && !diceobj.modelLoading){
			diceobj.loadModel(this.loaderGLTF);
		}
		
	}

	preloadUserModels(userID){
		let systemId = game.users.get(userID).getFlag("dice-so-nice","appearance").system;
		let dices = this.systems[systemId].dice;
		for(let i=0;i<dices.length;i++){
			if(dices[i].modelFile && !dices[i].modelLoading)
				dices[i].loadModel(this.loaderGLTF);
		}
	}

	//{id: 'standard', name: game.i18n.localize("DICESONICE.System.Standard")}
	addSystem(system, mode="default"){
		system.dice = [];
		system.mode = mode;
		this.systems[system.id] = system;
		if(mode == "exclusive"){
			this.systemsHaveExclusive = true;
			if(this.systems[this.systemActivated] && this.systems[this.systemActivated].mode != "exclusive")
				this.setSystem(system.id, false);
		}
		else if(mode=="force")
			this.setSystem(system.id, true);
		
	}
	//{type:"",labels:[],system:""}
	//Should have been called "addDicePresetFromModel" but ¯\_(ツ)_/¯
	addDicePreset(dice, shape = null){
		if(!shape)
			shape = dice.type;
		let model = this.systems["standard"].dice.find(el => el.type == shape);
		let preset = new DicePreset(dice.type, model.shape);
		preset.name = dice.type;
		preset.setLabels(dice.labels);
		preset.setModel(dice.modelFile);
		if(dice.values){
			if(dice.values.min == undefined)
				dice.values.min = 1;
			if(dice.values.max == undefined)
				dice.values.max = model.values.length;
			if(dice.values.step == undefined)
				dice.values.step = 1;
			preset.setValues(dice.values.min,dice.values.max,dice.values.step);
		} else {
			preset.values = model.values;
			preset.valueMap = model.valueMap;
		}
		preset.mass = model.mass;
		preset.scale = model.scale;
		preset.inertia = model.inertia;
		preset.system = dice.system;
		preset.font = dice.font;
		preset.fontScale = dice.fontScale || null;
		preset.colorset = dice.colorset || null;
		//If it overrides an existing model that isn't a numbered die, set a font scale to prevent undesired fontScale from previous model
		if(!preset.fontScale && !["d2","d4","d6","d8","d10","d12","d20","d100"].includes(dice.type) && this.systems["standard"].dice.find(el => el.type == dice.type))
			preset.fontScale = DICE_SCALE[shape];
		
		if(dice.bumpMaps && dice.bumpMaps.length)
			preset.setBumpMaps(dice.bumpMaps);
		this.register(preset);
		if(this.systemActivated == dice.system)
			this.setSystem(dice.system);

		if(dice.font && !this.fontFamilies.includes(dice.font)){
			this.fontFamilies.push(dice.font);
		}
	}

	//Is called when trying to create a DicePreset by guessing its faces from the CONFIG entries
	internalAddDicePreset(diceobj){
		let shape = "d";
		if(diceobj.faces == 3)
			shape += "6";
		else
			shape += diceobj.faces;
		let type = "d" + diceobj.constructor.DENOMINATION;
		let model = this.systems["standard"].dice.find(el => el.type == shape);
		let preset = new DicePreset(type, model.shape);
		preset.name = diceobj.name;
		let labels = [];
		for(let i = 1;i<= diceobj.faces;i++){
			labels.push(diceobj.getResultLabel({result:i}));
		}
		preset.setLabels(labels);
		preset.setValues(1,diceobj.faces);
		preset.mass = model.mass;
		preset.inertia = model.inertia;
		preset.scale = model.scale;
		this.register(preset);
	}

	setSystem(systemId, force=false){
		if(this.systemForced && systemId != this.systemActivated)
			return;
		//first we reset to standard
		let dices = this.systems["standard"].dice;
		for(let i=0;i<dices.length;i++)
			this.dice[dices[i].type] = dices[i];
		//Then we apply override
		if(systemId!= "standard" && this.systems.hasOwnProperty(systemId))
		{
			dices = this.systems[systemId].dice;
			for(let i=0;i<dices.length;i++){
				this.dice[dices[i].type] = dices[i];
			}
		}
		if(force)
			this.systemForced = true;
		this.systemActivated = systemId;
		if(systemId != this.systemActivated)
			this.disposeCachedMaterials();
	}

	async preloadModels(systemId){
		if(systemId!= "standard" && this.systems.hasOwnProperty(systemId))
		{
			let modelsPromise = [];
			let dices = this.systems[systemId].dice;
			for(let i=0;i<dices.length;i++){
				if(this.dice[dices[i].type].modelFile)
					modelsPromise.push(this.dice[dices[i].type].loadModel(this.loaderGLTF));
			}
			await Promise.all(modelsPromise);
		}
	}

	disposeCachedMaterials(type = null){
		for (const material in this.baseTextureCache) {
			if(type == null || material.substr(0,type.length) == type){
				this.baseTextureCache[material].map.dispose();
				if(this.baseTextureCache[material].bumpMap)
				this.baseTextureCache[material].bumpMap.dispose();
				this.baseTextureCache[material].dispose();
				delete this.baseTextureCache[material];
			}
		}
	}

	/**
	 * Copied from FVTT core and modified for DsN
	 * @return {Promise<void>}
	 * @private
	 */
	async _loadFonts() {
		for (let font of this.fontFamilies) {
			document.fonts.load(`1rem ${font}`);
		}
		const timeout = new Promise(resolve => setTimeout(resolve, 3000));
		return Promise.race([document.fonts.ready, timeout]);
	}

	// returns a dicemesh (THREE.Mesh) object
	create(scopedTextureCache, type, appearance) {
		let diceobj = this.dice[type];
		let scopedScale = scopedTextureCache.type == "board" ? this.baseScale : 60;
		if (!diceobj) return null;
		let dicemesh;

		let geom = this.geometries[type+scopedScale];
		if(!geom) {
			geom = this.createGeometry(diceobj.shape, diceobj.scale, scopedScale);
			this.geometries[type+scopedScale] = geom;
		}
		if (!geom) return null;

		if(diceobj.model){
			dicemesh = diceobj.model.scene.children[0].clone();
			let scale = scopedScale/100;
			dicemesh.scale.set(scale,scale,scale);
			if(!dicemesh.geometry)
				dicemesh.geometry = {};
			dicemesh.geometry.cannon_shape = geom.cannon_shape;
			if(diceobj.model.animations.length>0){
				dicemesh.mixer = new THREE.AnimationMixer(dicemesh);
				dicemesh.mixer.clipAction(diceobj.model.animations[0]).play();
			}
		}else{
			let materialData = this.generateMaterialData(diceobj, appearance);

			let baseTextureCacheString = scopedTextureCache.type+type+materialData.cacheString;
			let materials;
			if(this.baseTextureCache[baseTextureCacheString])
				materials = this.baseTextureCache[baseTextureCacheString];
			else
				materials = this.createMaterials(scopedTextureCache, baseTextureCacheString, diceobj, materialData);
			
			dicemesh = new THREE.Mesh(geom, materials);

			if (diceobj.color) {
				dicemesh.material[0].color = new THREE.Color(diceobj.color);
				dicemesh.material[0].emissive = new THREE.Color(diceobj.color);
				dicemesh.material[0].emissiveIntensity = 1;
				dicemesh.material[0].needsUpdate = true;
			}
		}
		
		dicemesh.result = [];
		dicemesh.shape = diceobj.shape;
		dicemesh.rerolls = 0;
		dicemesh.resultReason = 'natural';

		let factory = this;
		dicemesh.getFaceValue = function() {
			let reason = this.resultReason;
			let vector = new THREE.Vector3(0, 0, this.shape == 'd4' ? -1 : 1);
			let faceCannon = new THREE.Vector3();
			let closest_face, closest_angle = Math.PI * 2;
			for (let i = 0, l = this.body_sim.shapes[0].faceNormals.length; i < l; ++i) {
				if(DICE_MODELS[this.shape].faceValues[i] == 0)
					continue;
				faceCannon.copy(this.body_sim.shapes[0].faceNormals[i]);
				
				let angle = faceCannon.applyQuaternion(this.body_sim.quaternion).angleTo(vector);
				if (angle < closest_angle) {
					closest_angle = angle;
					closest_face = i;
				}
			}
			const diceobj = factory.dice[this.notation.type];
			let dieValue = DICE_MODELS[this.shape].faceValues[closest_face];

			if (this.shape == 'd4') {
				return {value: dieValue, label: diceobj.labels[dieValue-1], reason: reason};
			}
			let labelIndex = dieValue;
			if (['d10','d2'].includes(this.shape)) labelIndex += 1;
			let label = diceobj.labels[labelIndex+1];

			return {value: dieValue, label: label, reason: reason};
		};

		dicemesh.storeRolledValue = function() {
			this.result.push(this.getFaceValue());
		};

		dicemesh.getLastValue = function() {
			if (!this.result || this.result.length < 1) return {value: undefined, label: '', reason: ''};

			return this.result[this.result.length-1];
		};

		dicemesh.setLastValue = function(result) {
			if (!this.result || this.result.length < 1) return;
			if (!result || result.length < 1) return;

			return this.result[this.result.length-1] = result;
		};

		return dicemesh;
	}

	get(type) {
		return this.dice[type];
	}
	createMaterials(scopedTextureCache, baseTextureCacheString, diceobj, materialData) {
		//TODO : createMaterials
		if(this.baseTextureCache[baseTextureCacheString])
			return this.baseTextureCache[baseTextureCacheString];

		let labels = diceobj.labels;
		if (diceobj.shape == 'd4') {
			labels = diceobj.labels[0];
		}
		//If the texture is an array of texture (for random face texture), we look at the first element to determine the faces material and the edge texture
		let dice_texture = Array.isArray(materialData.texture) ? materialData.texture[0] : materialData.texture;

		var mat;
		let materialSelected = this.material_options[materialData.material] ? this.material_options[materialData.material] : this.material_options["plastic"];
		if(!this.bumpMapping){
			delete materialSelected.roughnessMap;
		}
		switch(materialSelected.type){
			case "phong":
				mat = new THREE.MeshPhongMaterial(materialSelected.options);
				break;
			case "standard":
				mat = new THREE.MeshStandardMaterial(materialSelected.options);
				break;
			default: //plastic
				mat = new THREE.MeshPhongMaterial(this.material_options.plastic.options);
		}
		if(materialSelected.scopedOptions){
			if(materialSelected.scopedOptions.envMap)
				mat.envMap = scopedTextureCache.textureCube;
			if(materialSelected.scopedOptions.roughnessMap)
				mat.roughnessMap = scopedTextureCache[materialSelected.scopedOptions.roughnessMap];
		}
		let font = {
			"type":diceobj.font,
			"scale": diceobj.fontScale ? diceobj.fontScale:null
		};
		
		if(!font.type){
			font.type = materialData.font;
		}
		if(!font.scale){
			if(materialData.fontScale[diceobj.type])
				font.scale = materialData.fontScale[diceobj.type];
			else{
				font.scale = DICE_SCALE[diceobj.shape];
			}	
		}

		let canvas = document.createElement("canvas");
		let context = canvas.getContext("2d", {alpha: true});
		context.globalAlpha = 0;

		let canvasBump = document.createElement("canvas");
		let contextBump = canvasBump.getContext("2d", {alpha: true});
		contextBump.globalAlpha = 0;

		let texturesPerLine = Math.ceil(Math.sqrt(labels.length));
		let sizeTexture = 256;
		let ts = this.calc_texture_size(Math.sqrt(labels.length)*sizeTexture, true);
		
		canvas.width = canvas.height = canvasBump.width = canvasBump.height = ts;
		let x = 0;
		let y = 0;
		let texturesOnThisLine = 0;
		for (var i = 0; i < labels.length; ++i) {
			if(texturesOnThisLine == texturesPerLine){
				y += sizeTexture;
				x = 0;
				texturesOnThisLine = 0;
			}
			if(i==0)//edge
			{
				//if the texture is fully opaque, we do not use it for edge
				let texture = {name:"none"};
				if(dice_texture.composite != "source-over")
					texture = dice_texture;
				this.createTextMaterial(context, contextBump, x, y, sizeTexture, diceobj, labels, font, i, texture, materialData);
			}
			else
			{
				this.createTextMaterial(context, contextBump, x, y, sizeTexture, diceobj, labels, font, i, materialData.texture, materialData);
			}
			texturesOnThisLine++;
			x += sizeTexture;
		}
		if(diceobj.values.length == 3) {
			for(i=2;i<5;i++){
				if(texturesOnThisLine == texturesPerLine){
					y += sizeTexture;
					x = 0;
					texturesOnThisLine = 0;
				}
				this.createTextMaterial(context, contextBump, x, y, sizeTexture, diceobj, labels, font, i, materialData.texture, materialData);
				texturesOnThisLine++;
				x += sizeTexture;
			}
		}

		//var img    = canvasBump.toDataURL("image/png");
		//document.write('<img src="'+img+'"/>');
		//generate basetexture for caching
		if(!this.baseTextureCache[baseTextureCacheString]){
			let texture = new THREE.CanvasTexture(canvas);
			texture.flipY = false;
			mat.map = texture;
			mat.map.anisotropy = 4;
			if(this.bumpMapping){
				let bumpMap = new THREE.CanvasTexture(canvasBump);
				bumpMap.flipY = false;
				mat.bumpMap = bumpMap;
				mat.bumpMap.anisotropy = 4;
			}
		}

		//mat.displacementMap = mat.bumpMap;

		switch(materialData.material){
			case "chrome":
				if(this.bumpMapping)
					mat.metalnessMap = mat.bumpMap;
				break;
		}
		
		mat.opacity = 1;
		mat.transparent = true;
		mat.depthTest = true;
		mat.needUpdate = true;
		this.baseTextureCache[baseTextureCacheString] = mat;
		return mat;
	}
	createTextMaterial(context, contextBump, x, y, ts, diceobj, labels, font, index, texture, materialData) {
		if (labels[index] === undefined) return null;

		let forecolor = materialData.foreground;
		let outlinecolor = materialData.outline;
		let backcolor = index > 0 ? materialData.background : materialData.edge != "" ? materialData.edge:materialData.background;

		if(Array.isArray(texture))
			texture = texture[Math.floor(Math.random() * texture.length)];
		
		let text = labels[index];
		let normal = diceobj.normals[index];
		let isTexture = false;
		let margin = 1.0;

		// create color
		context.fillStyle = backcolor;
		context.fillRect(x, y, ts, ts);

		contextBump.fillStyle = "#FFFFFF";
		contextBump.fillRect(x, y, ts, ts);

		//create underlying texture
		if (texture.name != '' && texture.name != 'none') {
			context.save();
			context.beginPath();
			context.rect(x,y,ts,ts);
			context.clip();
			context.globalCompositeOperation = texture.composite || 'source-over';
			context.drawImage(texture.texture, x, y, ts, ts);
			context.restore();
			
			if (texture.bump != '') {
				contextBump.drawImage(texture.bump, x, y, ts, ts);
			}
		}

		// create text
		context.globalCompositeOperation = 'source-over';
		context.textAlign = "center";
		context.textBaseline = "middle";

		contextBump.textAlign = "center";
		contextBump.textBaseline = "middle";
		contextBump.shadowColor = "#000000";
		contextBump.shadowOffsetX = 1;
		contextBump.shadowOffsetY = 1;
		contextBump.shadowBlur = 3;
		
		if (diceobj.shape != 'd4') {
			
			//custom texture face
			if(text instanceof HTMLImageElement){
				isTexture = true;
				context.drawImage(text, 0,0,text.width,text.height,x,y,ts,ts);
				if(normal)
					contextBump.drawImage(normal, 0,0,text.width,text.height,x,y,ts,ts);
			}
			else{
				let fontsize = ts / (1 + 2 * margin);
				let textstarty = (ts / 2);
				let textstartx = (ts / 2);

				if(font.scale)
					fontsize *= font.scale;

				//Needed for every fonts
				switch(diceobj.shape){
					case 'd10':
						textstarty = textstartx*1.3;
						break
					case 'd8':
						textstarty = textstarty*1.1;
						break;
					case 'd12':
						textstarty = textstarty*1.08;
						break;
					case 'd20':
						textstarty = textstartx*1.2;
						break;
					case 'd6':
						textstarty = textstarty*1.1;
						break;
				}

				context.font =  fontsize+ 'pt '+font.type;
				contextBump.font =  fontsize+ 'pt '+font.type;
				var lineHeight = fontsize;
				
				let textlines = text.split("\n");

				if (textlines.length > 1) {
					fontsize = fontsize / textlines.length;
					context.font =  fontsize+ 'pt '+font.type;
					contextBump.font =  fontsize+ 'pt '+font.type;

					//to find the correct text height for every possible fonts, we have no choice but to use the great (and complex) pixi method
					//First we create a PIXI.TextStyle object, to pass later to the measure method
					let pixiStyle = new PIXI.TextStyle({
						fontFamily: font.type,
						fontSize: fontsize,
						stroke: "#0000FF",
						strokeThickness: (outlinecolor != 'none' && outlinecolor != backcolor) ? 1:0
					});
					//Then we call the PIXI measureText method
					let textMetrics = PIXI.TextMetrics.measureText(textlines.join(""),pixiStyle);

					lineHeight = textMetrics.lineHeight;
					if(textlines[0]!=""){
						textstarty -= (lineHeight * textlines.length) / 2;
						//On a D12, we add a little padding because it looks better to human eyes even tho it's not really the center anymore
						if(diceobj.shape == "d12")
							textstarty = textstarty *1.08;
					}
					else
						textlines.shift();
				}

				for(let i = 0, l = textlines.length; i < l; i++){
					let textline = textlines[i].trim();

					// attempt to outline the text with a meaningful color
					if (outlinecolor != 'none' && outlinecolor != backcolor) {
						context.strokeStyle = outlinecolor;
						context.lineWidth = 5;
						context.strokeText(textlines[i], textstartx+x, textstarty+y);

						contextBump.strokeStyle = "#555555";
						contextBump.lineWidth = 5;
						contextBump.strokeText(textlines[i], textstartx+x, textstarty+y);
						if (textline == '6' || textline == '9') {
							context.strokeText('  .', textstartx+x, textstarty+y);
							contextBump.strokeText('  .', textstartx+x, textstarty+y);
						}
					}

					context.fillStyle = forecolor;
					context.fillText(textlines[i], textstartx+x, textstarty+y);

					contextBump.fillStyle = "#555555";
					contextBump.fillText(textlines[i], textstartx+x, textstarty+y);
					if (textline == '6' || textline == '9') {
						context.fillText('  .', textstartx+x, textstarty+y);
						contextBump.fillText('  .', textstartx+x, textstarty+y);
					}
					textstarty += (lineHeight * 1.5);
				}
			}

		} else {

			var hw = (ts / 2);
			var hh = (ts / 2);
			let fontsize = (ts / 128 * 24);
			if(font.scale)
				fontsize *= font.scale;
			context.font =  fontsize+'pt '+font.type;
			contextBump.font =  fontsize+'pt '+font.type;

			//draw the numbers
			let wShift = 1;
			let hShift = 1;
			for (let i=0;i<text.length;i++) {
				switch(i){
					case 0:
						hShift = 1.13;
						break;
					case 1:
						hShift=0.87;
						wShift=1.13;
						break;
					case 2:
						wShift = 0.87;
				}
				//custom texture face
				if(text[i] instanceof HTMLImageElement){
					isTexture = true;
					let scaleTexture = text[i].width / ts;
					context.drawImage(text[i], 0,0,text[i].width,text[i].height,100/scaleTexture+x,25/scaleTexture+y,60/scaleTexture,60/scaleTexture);
				}
				else{
					// attempt to outline the text with a meaningful color
					if (outlinecolor != 'none' && outlinecolor != backcolor) {
						context.strokeStyle = outlinecolor;
						
						context.lineWidth = 5;
						context.strokeText(text[i], hw*wShift+x, (hh - ts * 0.3)*hShift+y);

						contextBump.strokeStyle = "#555555";
						contextBump.lineWidth = 5;
						contextBump.strokeText(text[i], hw*wShift+x, (hh - ts * 0.3)*hShift+y);
					}

					//draw label in top middle section
					context.fillStyle = forecolor;
					context.fillText(text[i], hw*wShift+x, (hh - ts * 0.3)*hShift+y);
					contextBump.fillStyle = "#555555";
					contextBump.fillText(text[i], hw*wShift+x, (hh - ts * 0.3)*hShift+y);
					//var img    = canvas.toDataURL("image/png");
					//document.write('<img src="'+img+'"/>');
				}

				//rotate 1/3 for next label
				context.translate(hw+x, hh+y);
				context.rotate(Math.PI * 2 / 3);
				context.translate(-hw-x, -hh-y);

				contextBump.translate(hw+x, hh+y);
				contextBump.rotate(Math.PI * 2 / 3);
				contextBump.translate(-hw-x, -hh-y);
			}
		}
	}

	getAppearanceForDice(appearances, dicetype, dicenotation = null){
		/*
			We use either (by order of priority): 
			1) A notation appearance
			2) A flavor/notation colorset
			3) The colorset of the diceobj
			4) The colorset configured by the player for this dice type
			5) The global colorset of the player
		*/
		let diceobj = this.dice[dicetype];
		let settings;
		if(appearances[dicetype])
			settings = appearances[dicetype];
		else
			settings = appearances.global;

		//To keep compatibility with both older integrations and user settings, we use the DiceColor naming convention from there
		let appearance = {
			colorset: settings.colorset,
			foreground: settings.labelColor,
			background: settings.diceColor,
			outline: settings.outlineColor,
			edge: settings.edgeColor,
			texture: settings.texture,
			material: settings.material,
			font: settings.font,
			system: settings.system
		};

		if(settings.colorset != "custom"){
			let colorsetData = DiceColors.getColorSet(settings.colorset);
			appearance.foreground = colorsetData.foreground;
			appearance.background = colorsetData.background;
			appearance.outline = colorsetData.outline;
			appearance.edge = colorsetData.edge ? colorsetData.edge : "";
		}

		if(diceobj.colorset){
			let colorsetData = DiceColors.getColorSet(diceobj.colorset);
			mergeObject(appearance, colorsetData);
		}
		
		if(dicenotation){
			let colorset = null;
			if (dicenotation.options.colorset)
				colorset = dicenotation.options.colorset;
			else if (dicenotation.options.flavor && COLORSETS[dicenotation.options.flavor]) {
				colorset = dicenotation.options.flavor;
			}
			if(colorset){
				let colorsetData = DiceColors.getColorSet(colorset);
				mergeObject(appearance, colorsetData);
			}
			if(dicenotation.options.appearance){
				mergeObject(appearance, dicenotation.options.appearance);
			}
		}
		return appearance;
	}

	generateMaterialData(diceobj, appearance) {
		let materialData = {};
		let colorindex;

		let colorsetData = DiceColors.getColorSet(appearance.colorset);
		if(appearance.texture && !appearance.texture.id)
			appearance.texture = DiceColors.getTexture(appearance.texture);

		// set base color first
		if (Array.isArray(appearance.background)) {

			colorindex = Math.floor(Math.random() * appearance.background.length);

			// if color list and label list are same length, treat them as a parallel list
			if (Array.isArray(appearance.foreground) && appearance.foreground.length == appearance.background.length) {
				materialData.foreground = appearance.foreground[colorindex];

				// if label list and outline list are same length, treat them as a parallel list
				if (Array.isArray(appearance.outline) && appearance.outline.length == appearance.foreground.length) {
					materialData.outline = appearance.outline[colorindex];
				}
			}
			// if texture list is same length do the same
			if (Array.isArray(appearance.texture) && appearance.texture.length == appearance.background.length) {
				materialData.texture = appearance.texture[colorindex];
			}

			//if edge list and color list are same length, treat them as a parallel list
			if (Array.isArray(appearance.edge) && appearance.edge.length == appearance.background.length) {
				materialData.edge = appearance.edge[colorindex];
			}

			materialData.background = appearance.background[colorindex];
		} else {
			materialData.background = appearance.background;
		}

		if(!materialData.edge){
			if (Array.isArray(appearance.edge)) {
				colorindex = Math.floor(Math.random() * appearance.edge.length);
				materialData.edge = appearance.edge[colorindex];
			}
			else
				materialData.edge = appearance.edge;
		}

		// if selected label color is still not set, pick one
		if(!materialData.foreground){
			if(Array.isArray(appearance.foreground)){
				colorindex = appearance.foreground[Math.floor(Math.random() * appearance.foreground.length)];

				// if label list and outline list are same length, treat them as a parallel list
				if (Array.isArray(appearance.outline) && appearance.outline.length == appearance.foreground.length) {
					materialData.outline = appearance.outline[colorindex];
				}

				materialData.foreground = appearance.foreground[colorindex];
			}
			else
				materialData.foreground = appearance.foreground;
		}

		// if selected label outline is still not set, pick one
		if (!materialData.outline){
			if(Array.isArray(appearance.outline)) {
				colorindex = appearance.outline[Math.floor(Math.random() * appearance.outline.length)];

				materialData.outline = appearance.outline[colorindex];
			} else {
				materialData.outline = appearance.outline;
			}
		}

		// same for textures list
		if(!materialData.texture){
			if (Array.isArray(appearance.texture)) {
				materialData.texture = appearance.texture[Math.floor(Math.random() * appearance.texture.length)];
			} else if(appearance.texture.name == "none"){
				//set to none/theme
				materialData.texture = colorsetData.texture;
			} else {
				materialData.texture = appearance.texture;
			}
		}

		//Same for material
		let baseTexture = Array.isArray(materialData.texture) ? materialData.texture[0]:materialData.texture;

		if(appearance.material == "auto" || appearance.material == ""){
			if(colorsetData.material)
				materialData.material = colorsetData.material;
			else
				materialData.material = baseTexture.material;
		} else {
			materialData.material = appearance.material;
		}

		//for font, we priorize the dicepreset font, then custom, then coloret
		if(appearance.font == "auto"){
			if(diceobj.font){
				materialData.font = diceobj.font;
			} else {
				materialData.font = colorsetData.font;
			}
		} else {
			materialData.font = appearance.font;
		}

		if(appearance.fontScale)
			materialData.fontScale = appearance.fontScale;
		else if(diceobj.fontScale){
			materialData.fontScale = diceobj.fontScale;
		} else {
			materialData.fontScale = colorsetData.fontScale;
		}
		
		materialData.cacheString = materialData.background+materialData.foreground+materialData.outline+materialData.texture.name+materialData.edge+materialData.material+materialData.font;
		return materialData;
	}

	calc_texture_size(approx, ceil = false) {
		let size = 0;
		if(!ceil)
			size = Math.pow(2, Math.floor(Math.log(approx) / Math.log(2)));
		else
			size = Math.pow(2, Math.ceil(Math.log(approx) / Math.log(2)));
		return size;
	}

	createGeometry(type, typeScale, scopedScale) {
		let radius = typeScale * scopedScale;
		let geom = null;
		switch (type) {
			case 'd2':
				geom = this.create_d2_geometry(radius, scopedScale);
				break;
			case 'd4':
				geom = this.create_d4_geometry(radius, scopedScale);
				break;
			case 'd6':
				geom = this.create_d6_geometry(radius, scopedScale);
				break;
			case 'd8':
				geom = this.create_d8_geometry(radius, scopedScale);
				break;
			case 'd10':
				geom = this.create_d10_geometry(radius, scopedScale);
				break;
			case 'd12':
				geom = this.create_d12_geometry(radius, scopedScale);
				break;
			case 'd20':
				geom = this.create_d20_geometry(radius, scopedScale);
				break;
		}
		return geom;
	}

	load_geometry(type, scopedScale){
		var loader = new THREE.BufferGeometryLoader();
		let bufferGeometry = loader.parse(DICE_MODELS[type]);
		bufferGeometry.scale(scopedScale/100,scopedScale/100,scopedScale/100);
		if(type!="d10")
			bufferGeometry.rotateY(1.5708);
		return bufferGeometry;
	}

	create_d2_geometry(radius, scopedScale){
		let geom = this.load_geometry("d2",scopedScale);
		geom.lookAt(new THREE.Vector3(0,1,0));
		geom.cannon_shape = new CANNON.Cylinder(1*radius,1*radius,0.1*radius,8);
		return geom;
	}

	create_d4_geometry(radius, scopedScale) {
		let geom = this.load_geometry("d4",scopedScale);
		var vertices = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
		var faces = [[1, 0, 2, 1], [0, 1, 3, 2], [0, 3, 2, 3], [1, 2, 3, 4]];
		geom.cannon_shape = this.create_geom(vertices, faces, radius);
		return geom;
	}

	create_d6_geometry(radius, scopedScale) {
		let geom = this.load_geometry("d6",scopedScale);
		var vertices = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
				[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
		var faces = [[0, 3, 2, 1, 1], [1, 2, 6, 5, 2], [0, 1, 5, 4, 3],
				[3, 7, 6, 2, 4], [0, 4, 7, 3, 5], [4, 5, 6, 7, 6]];
		geom.cannon_shape = this.create_geom(vertices, faces, radius);
		return geom;
	}

	create_d8_geometry(radius, scopedScale) {
		let geometry = this.load_geometry("d8",scopedScale);
		
		var vertices = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
		var faces = [[0, 2, 4, 1], [0, 4, 3, 2], [0, 3, 5, 3], [0, 5, 2, 4], [1, 3, 4, 5],
				[1, 4, 2, 6], [1, 2, 5, 7], [1, 5, 3, 8]];
		geometry.cannon_shape = this.create_geom(vertices, faces, radius);
		return geometry;
	}

	create_d10_geometry(radius, scopedScale) {
		let geom = this.load_geometry("d10",scopedScale);
		//geom.scale(1.38,1.38,1.38);
		
		var a = Math.PI * 2 / 10, h = 0.105, v = -1;
		var vertices = [];
		for (var i = 0, b = 0; i < 10; ++i, b += a) {
			vertices.push([Math.cos(b), Math.sin(b), h * (i % 2 ? 1 : -1)]);
		}
		vertices.push([0, 0, -1]);
		vertices.push([0, 0, 1]);

		var faces = [
            [5, 6, 7, 11, 0],
            [4, 3, 2, 10, 1],
            [1, 2, 3, 11, 2],
            [0, 9, 8, 10, 3],
            [7, 8, 9, 11, 4],
            [8, 7, 6, 10, 5],
            [9, 0, 1, 11, 6],
            [2, 1, 0, 10, 7],
            [3, 4, 5, 11, 8],
            [6, 5, 4, 10, 9]
        ];
		geom.cannon_shape = this.create_geom(vertices, faces, radius);
		//geom = this.scaleGeometryToShape(geom);
		return geom;
	}

	create_d12_geometry(radius, scopedScale) {
		let geom = this.load_geometry("d12",scopedScale);
		var p = (1 + Math.sqrt(5)) / 2, q = 1 / p;
		var vertices = [[0, q, p], [0, q, -p], [0, -q, p], [0, -q, -p], [p, 0, q],
				[p, 0, -q], [-p, 0, q], [-p, 0, -q], [q, p, 0], [q, -p, 0], [-q, p, 0],
				[-q, -p, 0], [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1], [-1, 1, 1],
				[-1, 1, -1], [-1, -1, 1], [-1, -1, -1]];
		var faces = [[2, 14, 4, 12, 0, 1], [15, 9, 11, 19, 3, 2], [16, 10, 17, 7, 6, 3], [6, 7, 19, 11, 18, 4],
				[6, 18, 2, 0, 16, 5], [18, 11, 9, 14, 2, 6], [1, 17, 10, 8, 13, 7], [1, 13, 5, 15, 3, 8],
				[13, 8, 12, 4, 5, 9], [5, 4, 14, 9, 15, 10], [0, 12, 8, 10, 16, 11], [3, 19, 7, 17, 1, 12]];

		geom.cannon_shape = this.create_geom(vertices, faces, radius);
		return geom;
	}

	create_d20_geometry(radius, scopedScale) {
		
		let geom = this.load_geometry("d20",scopedScale);

		var t = (1 + Math.sqrt(5)) / 2;
		var vertices = [[-1, t, 0], [1, t, 0 ], [-1, -t, 0], [1, -t, 0],
				[0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
				[t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
		var faces = [[0, 11, 5, 1], [0, 5, 1, 2], [0, 1, 7, 3], [0, 7, 10, 4], [0, 10, 11, 5],
				[1, 5, 9, 6], [5, 11, 4, 7], [11, 10, 2, 8], [10, 7, 6, 9], [7, 1, 8, 10],
				[3, 9, 4, 11], [3, 4, 2, 12], [3, 2, 6, 13], [3, 6, 8, 14], [3, 8, 9, 15],
				[4, 9, 5, 16], [2, 4, 11, 17], [6, 2, 10, 18], [8, 6, 7, 19], [9, 8, 1, 20]];
		geom.cannon_shape = this.create_geom(vertices, faces, radius);
		return geom;
	}

	create_shape(vertices, faces, radius) {
		var cv = new Array(vertices.length), cf = new Array(faces.length);
		for (var i = 0; i < vertices.length; ++i) {
			var v = vertices[i];
			cv[i] = new CANNON.Vec3(v.x * radius, v.y * radius, v.z * radius);
		}
		for (var i = 0; i < faces.length; ++i) {
			cf[i] = faces[i].slice(0, faces[i].length - 1);
		}
		return new CANNON.ConvexPolyhedron(cv, cf);
	}

	create_geom(vertices, faces, radius) {
		var vectors = new Array(vertices.length);
		for (var i = 0; i < vertices.length; ++i) {
			vectors[i] = (new THREE.Vector3).fromArray(vertices[i]).normalize();
		}
		let cannon_shape = this.create_shape(vectors, faces, radius);
		return cannon_shape;
	}
}