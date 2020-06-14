import {DiceFactory} from './DiceFactory.js';
import {DiceBox} from './DiceBox.js';
import {DiceColors, TEXTURELIST, COLORSETS} from './DiceColors.js';

Hooks.once('init', () => {

    game.settings.registerMenu("dice-so-nice", "dice-so-nice", {
        name: "DICESONICE.config",
        label: "DICESONICE.configTitle",
        hint: "DICESONICE.configHint",
        icon: "fas fa-dice-d20",
        type: DiceConfig,
        restricted: false
    });
});

Hooks.once('ready', () => {

    game.settings.register("dice-so-nice", "settings", {
        name: "3D Dice Settings",
        scope: "client",
        default: Dice3D.DEFAULT_OPTIONS,
        type: Object,
        config: false,
        onChange: settings => {
            game.dice3d.update(settings);
        }
    });

    game.dice3d = new Dice3D();

    const original = Roll.prototype.toMessage;
    Roll.prototype.toMessage = function (chatData={}, {rollMode=null, create=true}={}) {

        if(!create) {
            return original.apply(this, arguments);
        }

        chatData = original.apply(this, [chatData, {rollMode, create:false}]);

        let blind = false, whisper;
        rollMode = rollMode || game.settings.get("core", "rollMode");
        if ( ["gmroll", "blindroll"].includes(rollMode) ) whisper = ChatMessage.getWhisperRecipients("GM");
        if ( rollMode === "blindroll" ) blind = true;
        if ( rollMode === "selfroll" ) whisper = [game.user.id];

        game.dice3d.showForRoll(this, whisper, blind).then(displayed => {
            chatData = displayed ? mergeObject(chatData, { sound: null }) : chatData;
            const messageOptions = {rollMode};
            CONFIG.ChatMessage.entityClass.create(chatData, messageOptions);
        });

        return chatData;
    };
});

Hooks.on('chatMessage', (chatLog, message, chatData) => {

    let [command, match] = chatLog.constructor.parse(message);
    if (!match) throw new Error("Unmatched chat command");

    if(["roll", "gmroll", "blindroll", "selfroll"].includes(command)) {
        chatLog._processDiceCommand(command, match, chatData, {});
        chatData.roll.toMessage(chatData, { rollMode: command });
        return false;
    }

});

/**
 * Generic utilities class...
 */
class Utils {

    /**
     *
     * @param cfg
     * @returns {{}}
     */
    static localize(cfg) {
        return Object.keys(cfg).reduce((i18nCfg, key) => {
                i18nCfg[key] = game.i18n.localize(cfg[key]);
                return i18nCfg;
            }, {}
        );
    };

    /**
     * Get the contrasting color for any hex color.
     *
     * @returns {String} The contrasting color (black or white)
     */
    static contrastOf(color){

        if (color.slice(0, 1) === '#') {
            color = color.slice(1);
        }

        if (color.length === 3) {
            color = color.split('').map(function (hex) {
                return hex + hex;
            }).join('');
        }

        const r = parseInt(color.substr(0,2),16);
        const g = parseInt(color.substr(2,2),16);
        const b = parseInt(color.substr(4,2),16);

        var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

        return (yiq >= 128) ? '#000000' : '#FFFFFF';
    };

    static prepareTextureList(){
        return Object.keys(TEXTURELIST).reduce((i18nCfg, key) => {
                i18nCfg[key] = game.i18n.localize(TEXTURELIST[key].name);
                return i18nCfg;
            }, {}
        );
    };

    static prepareColorsetList(){
        let groupedSetsList = Object.values(COLORSETS);
        groupedSetsList.sort((set1, set2) => {
            //if(game.i18n.localize(set1.category) < game.i18n.localize(set2.category)) return -1;
            //if(game.i18n.localize(set1.category) > game.i18n.localize(set2.category)) return 1;

            if(game.i18n.localize(set1.description) < game.i18n.localize(set2.description)) return -1;
            if(game.i18n.localize(set1.description) > game.i18n.localize(set2.description)) return 1;
        });
        let preparedList = {};
        for(let i = 0;i<groupedSetsList.length;i++){
            let locCategory = game.i18n.localize(groupedSetsList[i].category);
            if(!preparedList.hasOwnProperty(locCategory))
                preparedList[locCategory] = {};

            preparedList[locCategory][groupedSetsList[i].name] = game.i18n.localize(groupedSetsList[i].description);
        }

        return preparedList;
    };

    static prepareSystemList(){
        let systems = game.dice3d.box.dicefactory.systems;
        return Object.keys(systems).reduce((i18nCfg, key) => {
                if(!game.dice3d.box.dicefactory.systemForced || game.dice3d.box.dicefactory.systemActivated == key)
                    i18nCfg[key] = game.i18n.localize(systems[key].name);
                return i18nCfg;
            }, {}
        );
    };
}

/**
 * Main class to handle 3D Dice animations.
 */
export class Dice3D {

    static get DEFAULT_OPTIONS() {
        return {
            enabled: true,
            labelColor: Utils.contrastOf(game.user.color),
            diceColor: game.user.color,
            outlineColor: game.user.color,
            edgeColor: game.user.color,
            texture: "none",
            colorset: "custom",
            hideAfterRoll: true,
            timeBeforeHide: 2000,
            hideFX: 'fadeOut',
            autoscale: true,
            scale: 75,
            speed: 1,
            shadowQuality: 'high',
            sounds: true,
            system: "standard"
        };
    }

    static get CONFIG() {
        return mergeObject(Dice3D.DEFAULT_OPTIONS, game.settings.get("dice-so-nice", "settings"));
    }

    /**
     * Register a new system
     * The id is to be used with addDicePreset
     * The name can be a localized string
     * @param {Object} system {id, name}
     * @param {Boolean} forceActivate Will force activate this model. Other models won't be available
     */
    addSystem(system, forceActivate = false){
        this.box.dicefactory.addSystem(system);
        if(forceActivate)
            this.box.dicefactory.setSystem(system.id, forceActivate);
    }

    /**
     * Register a new dice preset
     * Type should be a known dice type (d4,d6,d8,d10,d12,d20,d100)
     * Labels contains either strings (unicode) or a path to a texture (png, gif, jpg, webp)
     * The texture file size should be 256*256
     * The system should be a system id already registered
     * @param {Object} dice {type:"",labels:[],system:""}
     */
    addDicePreset(dice){
        this.box.dicefactory.addDicePreset(dice);
    }

    /**
     * Add a texture to the list of textures and preload it
     * @param {String} textureID 
     * @param {Object} textureData 
     * @returns {Promise}
     */
    addTexture(textureID, textureData){
        return new Promise((resolve) => {
            let textureEntry = {};
            textureEntry[textureID] = textureData;
            TEXTURELIST[textureID] = textureData;
            DiceColors.loadTextures(textureEntry, (images) => {
                resolve();
            });
        });
    }

    /**
     * Add a colorset (theme)
     * @param {Object} colorset 
     */
    addColorset(colorset){
        COLORSETS[colorset.name] = colorset;
        DiceColors.initColorSets(colorset);
    }

    /**
     * Ctor. Create and initialize a new Dice3d.
     */
    constructor() {
        Hooks.call("diceSoNiceInit", this);
        this._buildCanvas();
        this._initListeners();
        this._buildDiceBox();
        DiceColors.loadTextures(TEXTURELIST, (images) => {
            DiceColors.initColorSets();
            Hooks.call("diceSoNiceReady", this);
        });
    }

    /**
     * Create and inject the dice box canvas resizing to the window total size.
     *
     * @private
     */
    _buildCanvas() {
        this.canvas = $('<div id="dice-box-canvas" style="position: absolute; left: 0; top: 0; z-index: 1000; pointer-events: none;"></div>');
        this.canvas.appendTo($('body'));
        this._resizeCanvas();
    }

    /**
     * resize to the window total size.
     *
     * @private
     */
    _resizeCanvas() {
        const sidebarWidth = $('#sidebar').width();
        this.canvas.width(window.innerWidth - sidebarWidth + 'px');
        this.canvas.height(window.innerHeight - 1 + 'px');
    }

    /**
     * Build the dicebox.
     *
     * @private
     */
    _buildDiceBox() {
        this.DiceFactory = new DiceFactory();
        this.box = new DiceBox(this.canvas[0], this.DiceFactory, Dice3D.CONFIG);
		this.box.initialize();
    }

    /**
     * Init listeners on windows resize and on click if auto hide has been disabled within the settings.
     *
     * @private
     */
    _initListeners() {
        $(window).resize(() => {
            this._resizeCanvas();
            //this.box.reinit();
            //this.box.resetCache();
        });
        $('body,html').click(() => {
            const config = Dice3D.CONFIG;
            if(!config.hideAfterRoll && this.canvas.is(":visible")) {
                this.canvas.hide();
            }
        });
        game.socket.on('module.dice-so-nice', (data) => {
            if(!data.whisper || data.whisper.map(user => user._id).includes(game.user._id)) {
                this._showAnimation(data.formula, data.results, data.dsnConfig).then(() => {
                    //??
                });
            }
        });
    }

    /**
     * Check if 3D simulation is enabled from the settings.
     */
    isEnabled() {
        return Dice3D.CONFIG.enabled;
    }

    /**
     * Update the DiceBox with fresh new settgins.
     *
     * @param settings
     */
    update(settings) {
        this.box.update(settings);
    }

    /**
     * Show the 3D Dice animation for the
     *
     * @param roll an instance of Roll class to show 3D dice animation.
     * @param whisper
     * @param blind
     * @returns {Promise<boolean>} when resolved true if roll is if the animation was displayed, false if not.
     */
    showForRoll(roll, whisper, blind) {
        return this.show(new RollData(roll, whisper, blind));
    }

    /**
     * Show
     *
     * @param data data containing the formula and the result to show in the 3D animation.
     * @returns {Promise<boolean>} when resolved true if roll is if the animation was displayed, false if not.
     */
    show(data) {
        return new Promise((resolve, reject) => {

            if (!data) throw new Error("Roll data should be not null");

            const isEmpty = data.formula.length === 0 || data.results.length === 0;
            if(!isEmpty) {

                game.socket.emit("module.dice-so-nice", mergeObject(data, { user: game.user._id, dsnConfig: Dice3D.CONFIG}), () => {

                    if(!data.blind || data.whisper.map(user => user._id).includes(game.user._id)) {
                        this._showAnimation(data.formula, data.results, data.dsnConfig).then(displayed => {
                            resolve(displayed);
                        });
                    } else {
                        resolve(false);
                    }
                });
            } else {
                resolve(false);
            }
        });
    }

    /**
     *
     * @param formula
     * @param results
     * @returns {Promise<boolean>}
     * @private
     */
    _showAnimation(formula, results, dsnConfig) {
        return new Promise((resolve, reject) => {
            if(this.isEnabled() && !this.box.rolling) {
                this._beforeShow();
                this.box.start_throw(formula, results, dsnConfig, () => {
                        resolve(true);
                        this._afterShow();
                    }
                );
            } else {
                resolve(false);
            }
        });
    }

    /**
     *
     * @private
     */
    _beforeShow() {
        if(this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
        }

        this.canvas.stop(true, true);
        this.canvas.show();
    }

    /**
     *
     * @private
     */
    _afterShow() {
        if(Dice3D.CONFIG.hideAfterRoll) {
            this.timeoutHandle = setTimeout(() => {
                if(!this.box.rolling) {
                    if(Dice3D.CONFIG.hideFX === 'none') {
                        this.canvas.hide();
                    }
                    if(Dice3D.CONFIG.hideFX === 'fadeOut') {
                        this.canvas.fadeOut(1000);
                    }
                }
            }, Dice3D.CONFIG.timeBeforeHide);
        }
    }

    copyto(obj, res) {
        if (obj == null || typeof obj !== 'object') return obj;
        if (obj instanceof Array) {
            for (var i = obj.length - 1; i >= 0; --i)
                res[i] = Dice3D.copy(obj[i]);
        }
        else {
            for (var i in obj) {
                if (obj.hasOwnProperty(i))
                    res[i] = Dice3D.copy(obj[i]);
            }
        }
        return res;
    }

    copy(obj) {
        if (!obj) return obj;
        return Dice3D.copyto(obj, new obj.constructor());
    }
}


/**
 *
 */
class RollData {

    constructor(roll, whisper, blind) {

        if (!roll) throw new Error("Roll instance should be not null");

        if ( !roll._rolled ) roll.roll();

        this.formula = '';
        this.results = [];
        this.whisper = whisper;
        this.blind = blind;

        roll.dice.forEach(dice => {
            if([4, 6, 8, 10, 12, 20, 100].includes(dice.faces)) {
                let separator = this.formula.length > 1 ? ' + ' : '';
                let rolls = Math.min(dice.rolls.length, 20);
                this.formula += separator + (dice.rolls.length > 1 ? `${rolls}d${dice.faces}` : `d${dice.faces}`);
                if(dice.faces === 100) {
                    this.formula += ' + ' + (dice.rolls.length > 1 ? `${rolls}d10` : `d10`);
                }

                for(let i = 0; i < rolls; i++) {
                    let r = dice.rolls[i];
                    if(dice.faces === 100) {
                        this.results.push(parseInt(r.roll/10));
                        this.results.push(r.roll%10);
                    } else {
                        this.results.push(r.roll);
                    }
                }
            }
        });
    }

}

/**
 * Form application to configure settings of the 3D Dice.
 */
class DiceConfig extends FormApplication {

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: game.i18n.localize("DICESONICE.configTitle"),
            id: "dice-config",
            template: "modules/dice-so-nice/templates/dice-config.html",
            width: 500,
            height: 820,
            closeOnSubmit: true
        })
    }

    getData(options) {
        return mergeObject({
                fxList: Utils.localize({
                    "none": "DICESONICE.None",
                    "fadeOut": "DICESONICE.FadeOut"
                }),
                speedList: Utils.localize({
                    "1": "DICESONICE.NormalSpeed",
                    "2": "DICESONICE.2xSpeed",
                    "3": "DICESONICE.3xSpeed"
                }),
                textureList: Utils.prepareTextureList(),
                colorsetList: Utils.prepareColorsetList(),
                shadowQualityList: Utils.localize({
                    "none": "DICESONICE.None",
                    "low": "DICESONICE.Low",
                    "high" : "DICESONICE.High"
                }),
                systemList : Utils.prepareSystemList()
            },
            Dice3D.CONFIG
        );
    }

    activateListeners(html) {
        super.activateListeners(html);

        let canvas = document.getElementById('dice-gonfiguration-canvas');
        let config = mergeObject(
            Dice3D.CONFIG,
            {dimensions: { w: 500, h: 300 }, autoscale: false, scale: 70}
        );
        config = mergeObject(Dice3D.DEFAULT_OPTIONS, config);

        this.box = new DiceBox(canvas, game.dice3d.box.dicefactory, config);
        this.box.initialize();
        this.box.showcase(config);

        this.toggleHideAfterRoll();
        this.toggleAutoScale();
        this.toggleCustomColors();

        html.find('input[name="hideAfterRoll"]').change(this.toggleHideAfterRoll.bind(this));
        html.find('input[name="autoscale"]').change(this.toggleAutoScale.bind(this));
        html.find('select[name="colorset"]').change(this.toggleCustomColors.bind(this));
        html.find('input,select').change(this.onApply.bind(this));
    }

    toggleHideAfterRoll() {
        let hideAfterRoll = $('input[name="hideAfterRoll"]')[0].checked;
        $('input[name="timeBeforeHide"]').prop("disabled", !hideAfterRoll);
        $('select[name="hideFX"]').prop("disabled", !hideAfterRoll);
    }

    toggleAutoScale() {
        let autoscale = $('input[name="autoscale"]')[0].checked;
        $('input[name="scale"]').prop("disabled", autoscale);
        $('.range-value').css({ 'opacity' : autoscale ? 0.4 : 1});
    }

    toggleCustomColors() {
        let colorset = $('select[name="colorset"]').val() !== 'custom';
        $('input[name="labelColor"]').prop("disabled", colorset);
        $('input[name="diceColor"]').prop("disabled", colorset);
        $('input[name="outlineColor"]').prop("disabled", colorset);
        $('input[name="edgeColor"]').prop("disabled", colorset);
        $('input[name="labelColorSelector"]').prop("disabled", colorset);
        $('input[name="diceColorSelector"]').prop("disabled", colorset);
        $('input[name="outlineColorSelector"]').prop("disabled", colorset);
        $('input[name="edgeColorSelector"]').prop("disabled", colorset);
    }

    onApply(event) {
        event.preventDefault();

        setTimeout(() => {

            let config = {
                labelColor: $('input[name="labelColor"]').val(),
                diceColor: $('input[name="diceColor"]').val(),
                outlineColor: $('input[name="outlineColor"]').val(),
                edgeColor: $('input[name="edgeColor"]').val(),
                autoscale: false,
                scale: 70,
                shadowQuality:$('select[name="shadowQuality"]').val(),
                colorset: $('select[name="colorset"]').val(),
                texture: $('select[name="texture"]').val(),
                sounds: $('input[name="sounds"]').val() == "on",
                system: $('select[name="system"]').val()
            };

            this.box.update(config);
            this.box.showcase(config);
        }, 100);
    }

    async _updateObject(event, formData) {
        let settings = mergeObject(
            Dice3D.CONFIG,
            formData
        );
        await game.settings.set('dice-so-nice', 'settings', settings);
        ui.notifications.info(`Updated 3D Dice Settings Configuration.`);
    }

}