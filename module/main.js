import { DiceFactory } from './DiceFactory.js';
import { DiceBox } from './DiceBox.js';
import { DiceColors, TEXTURELIST, COLORSETS } from './DiceColors.js';
import { DiceNotation } from './DiceNotation.js';
import { DiceSFXManager } from './DiceSFXManager.js';

/**
 * Registers the exposed settings for the various 3D dice options.
 */
Hooks.once('init', () => {
    const debouncedReload = foundry.utils.debounce(window.location.reload, 100);
    game.settings.registerMenu("dice-so-nice", "dice-so-nice", {
        name: "DICESONICE.config",
        label: "DICESONICE.configTitle",
        hint: "DICESONICE.configHint",
        icon: "fas fa-dice-d20",
        type: DiceConfig,
        restricted: false
    });

    game.settings.register("dice-so-nice", "settings", {
        name: "3D Dice Settings",
        scope: "client",
        default: Dice3D.DEFAULT_OPTIONS,
        type: Object,
        config: false,
        onChange: settings => {
            if (game.dice3d) {
                if((game.dice3d.currentCanvasPosition != settings.canvasZIndex)||(game.dice3d.currentBumpMapping != settings.bumpMapping)||(game.dice3d.currentUseHighDPI != settings.useHighDPI))
                    debouncedReload();
                else
                    game.dice3d.update(settings);
            }
        }
    });

    game.settings.register("dice-so-nice", "maxDiceNumber", {
        name: "DICESONICE.maxDiceNumber",
        hint: "DICESONICE.maxDiceNumberHint",
        scope: "world",
        type: Number,
        default: 20,
        range: {
            min: 20,
            max: 100,
            step: 5
        },
        config: true
    });

    game.settings.register("dice-so-nice", "globalAnimationSpeed", {
        name: "DICESONICE.globalAnimationSpeed",
        hint: "DICESONICE.globalAnimationSpeedHint",
        scope: "world",
        type: String,
        choices: Utils.localize({
            "0": "DICESONICE.PlayerSpeed",
            "1": "DICESONICE.NormalSpeed",
            "2": "DICESONICE.2xSpeed",
            "3": "DICESONICE.3xSpeed"
        }),
        default: "0",
        config: true,
        onChange: debouncedReload
    });

    game.settings.register("dice-so-nice", "enabledSimultaneousRolls", {
        name: "DICESONICE.enabledSimultaneousRolls",
        hint: "DICESONICE.enabledSimultaneousRollsHint",
        scope: "world",
        type: Boolean,
        default: true,
        config: true,
        onChange: debouncedReload
    });

    game.settings.register("dice-so-nice", "diceCanBeFlipped", {
        name: "DICESONICE.diceCanBeFlipped",
        hint: "DICESONICE.diceCanBeFlippedHint",
        scope: "world",
        type: Boolean,
        default: true,
        config: true
    });

    game.settings.register("dice-so-nice", "enabled", {
        scope: "world",
        type: Boolean,
        default: true,
        config: false
    });

    game.settings.register("dice-so-nice", "formatVersion", {
        scope: "world",
        type: String,
        default: "",
        config: false
    });

    game.settings.register("dice-so-nice", "disabledDuringCombat", {
        name: "DICESONICE.disabledDuringCombat",
        hint: "DICESONICE.disabledDuringCombatHint",
        scope: "world",
        type: Boolean,
        default: false,
        config: true
    });

    game.settings.register("dice-so-nice", "immediatelyDisplayChatMessages", {
        name: "DICESONICE.immediatelyDisplayChatMessages",
        hint: "DICESONICE.immediatelyDisplayChatMessagesHint",
        scope: "world",
        type: Boolean,
        default: false,
        config: true
    });

    game.settings.register("dice-so-nice", "animateRollTable", {
        name: "DICESONICE.animateRollTable",
        hint: "DICESONICE.animateRollTableHint",
        scope: "world",
        type: Boolean,
        default: false,
        config: true
    });

    game.settings.register("dice-so-nice", "animateInlineRoll", {
        name: "DICESONICE.animateInlineRoll",
        hint: "DICESONICE.animateInlineRollHint",
        scope: "world",
        type: Boolean,
        default: true,
        config: true
    });

    game.settings.register("dice-so-nice", "hideNpcRolls", {
        name: "DICESONICE.hideNpcRolls",
        hint: "DICESONICE.hideNpcRollsHint",
        scope: "world",
        type: Boolean,
        default: false,
        config: true
    });

    game.settings.register("dice-so-nice", "allowInteractivity", {
        name: "DICESONICE.allowInteractivity",
        hint: "DICESONICE.allowInteractivityHint",
        scope: "world",
        type: Boolean,
        default: true,
        config: true,
        onChange: debouncedReload
    });

});

/**
 * Foundry is ready, let's create a new Dice3D!
 */
Hooks.once('ready', () => {
    Utils.migrateOldSettings().then((updated) => {
        if(updated){
            if(!game.settings.get("core", "noCanvas"))
                game.dice3d = new Dice3D();
            else
                logger.warn("Dice So Nice! is disabled because the user has activated the 'No-Canvas' mode");
        }
    });
});

/**
 * Intercepts all roll-type messages hiding the content until the animation is finished
 */
Hooks.on('createChatMessage', (chatMessage) => {
    //precheck for better perf
    let hasInlineRoll = game.settings.get("dice-so-nice", "animateInlineRoll") && chatMessage.data.content.indexOf('inline-roll') !== -1;
    if ((!chatMessage.isRoll && !hasInlineRoll) ||
        !chatMessage.isContentVisible ||
        (game.view != "stream" && (!game.dice3d || game.dice3d.messageHookDisabled)) ||
        (chatMessage.getFlag("core", "RollTable") && !game.settings.get("dice-so-nice", "animateRollTable"))) {
        return;
    }
    let roll = chatMessage.isRoll ? chatMessage.roll:null;
    if(hasInlineRoll){
        let JqInlineRolls = $($.parseHTML(chatMessage.data.content)).filter(".inline-roll.inline-result");
        if(JqInlineRolls.length == 0 && !chatMessage.isRoll) //it was a false positive
            return;
        let inlineRollList = [];
        JqInlineRolls.each((index,el) => {
            inlineRollList.push(Roll.fromJSON(unescape(el.dataset.roll)));
        });
        if(inlineRollList.length){
            if(chatMessage.isRoll)
                inlineRollList.push(chatMessage.roll);
            let pool = PoolTerm.fromRolls(inlineRollList);
            roll = Roll.fromTerms([pool]);
        }
        else if(!chatMessage.isRoll)
            return;
    }
    
    let actor = game.actors.get(chatMessage.data.speaker.actor);
    const isNpc =  actor ? actor.data.type === 'npc' : false;
    if(isNpc && game.settings.get("dice-so-nice", "hideNpcRolls")) {
        return;
    }

    //Remove the chatmessage sound if it is the core dice sound.
    if (Dice3D.CONFIG.sounds && chatMessage.data.sound == "sounds/dice.wav") {
        mergeObject(chatMessage.data, { "-=sound": null });
    }
    chatMessage._dice3danimating = true;
    if(game.view == "stream"){
        setTimeout(function(){
            delete chatMessage._dice3danimating;
            $(`#chat-log .message[data-message-id="${chatMessage.id}"]`).show();
            Hooks.callAll("diceSoNiceRollComplete", chatMessage.id);
            ui.chat.scrollBottom();
        },2500, chatMessage);
    } else {
        game.dice3d.showForRoll(roll, chatMessage.user, false, null, false, chatMessage.id).then(displayed => {
            delete chatMessage._dice3danimating;
            $(`#chat-log .message[data-message-id="${chatMessage.id}"]`).show();
            Hooks.callAll("diceSoNiceRollComplete", chatMessage.id);
            ui.chat.scrollBottom();
        });
    }
});

/**
 * Hide messages which are animating rolls.
 */
Hooks.on("renderChatMessage", (message, html, data) => {
    if (game.dice3d && game.dice3d.messageHookDisabled) {
        return;
    }
    if (message._dice3danimating) {
        html.hide();
    }
});

document.addEventListener("visibilitychange", function() {
    //if there was roll while the tab was hidden
    if(!document.hidden && game.dice3d && game.dice3d.hiddenAnimationQueue && game.dice3d.hiddenAnimationQueue.length){
        let now = (new Date()).getTime();
        for(let i=0;i<game.dice3d.hiddenAnimationQueue.length;i++){
            let anim = game.dice3d.hiddenAnimationQueue[i];
            if(now - anim.timestamp > 10000){
                anim.resolve(false);
            } else {
                game.dice3d._showAnimation(anim.data, anim.config).then(displayed => {
                    anim.resolve(displayed);
                });
            }
        }
        game.dice3d.hiddenAnimationQueue = [];
    }
});

/**
 * Generic utilities class...
 */
class Utils {

    /**
     * Migrate old 1.0 or 2.0 setting to new 4.0 format.
     */
     static async migrateOldSettings() {
        
        let formatversion = game.settings.get("dice-so-nice", "formatVersion");

        if(formatversion == ""){ //Never updated or first install
            if(!game.user.isGM){
                ui.notifications.warn(game.i18n.localize("DICESONICE.migrateMessageNeedGM"));
                return false;
            }
        } else if(formatversion == "4"){
            return true;
        }
        //v1 to v2
        let settings = game.settings.get("dice-so-nice", "settings");
        if (settings.diceColor || settings.labelColor) {
            let newSettings = mergeObject(Dice3D.DEFAULT_OPTIONS, settings, { insertKeys: false, insertValues: false });
            let appearance = mergeObject(Dice3D.DEFAULT_APPEARANCE(), settings, { insertKeys: false, insertValues: false });
            await game.settings.set("dice-so-nice", "settings", mergeObject(newSettings, { "-=dimensions": null, "-=fxList": null }));
            await game.user.setFlag("dice-so-nice", "appearance", appearance);
        }

        //v2 to v4
        await Promise.all(game.users.map(async (user)=>{
            let appearance = user.getFlag("dice-so-nice", "appearance");
            if(appearance && appearance.hasOwnProperty("labelColor")){
                let data = {
                    global:appearance
                };
                await user.unsetFlag("dice-so-nice", "appearance");
                await user.setFlag("dice-so-nice", "appearance", data);
            }
        }));
        game.settings.set("dice-so-nice", "formatVersion","4");

        ui.notifications.info(game.i18n.localize("DICESONICE.migrateMessage"));
        return true;
    }


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
    static contrastOf(color) {

        if (color.slice(0, 1) === '#') {
            color = color.slice(1);
        }

        if (color.length === 3) {
            color = color.split('').map(function (hex) {
                return hex + hex;
            }).join('');
        }

        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);

        var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

        return (yiq >= 128) ? '#000000' : '#FFFFFF';
    };

    static prepareTextureList() {
        return Object.keys(TEXTURELIST).reduce((i18nCfg, key) => {
            i18nCfg[key] = game.i18n.localize(TEXTURELIST[key].name);
            return i18nCfg;
        }, {}
        );
    };

    static prepareFontList() {
        let fontList = {
            "auto": game.i18n.localize("DICESONICE.FontAuto")
        };
        game.dice3d.box.dicefactory.fontFamilies.forEach(font => {
            fontList[font] = font;
        });
        return fontList;
    };

    static prepareColorsetList() {
        let sets = {};
        if (DiceColors.colorsetForced)
            sets[DiceColors.colorsetForced] = COLORSETS[DiceColors.colorsetForced];
        else
            sets = COLORSETS;
        let groupedSetsList = Object.values(sets);
        groupedSetsList.sort((set1, set2) => {
            if (game.i18n.localize(set1.description) < game.i18n.localize(set2.description)) return -1;
            if (game.i18n.localize(set1.description) > game.i18n.localize(set2.description)) return 1;
        });
        let preparedList = {};
        for (let i = 0; i < groupedSetsList.length; i++) {
            if(groupedSetsList[i].visibility == 'hidden')
                continue;
            let locCategory = game.i18n.localize(groupedSetsList[i].category);
            if (!preparedList.hasOwnProperty(locCategory))
                preparedList[locCategory] = {};
            preparedList[locCategory][groupedSetsList[i].name] = game.i18n.localize(groupedSetsList[i].description);
        }

        return preparedList;
    };

    static prepareSystemList() {
        let systems = game.dice3d.box.dicefactory.systems;
        return Object.keys(systems).reduce((i18nCfg, key) => {
            i18nCfg[key] = game.i18n.localize(systems[key].name);
            return i18nCfg;
        }, {});
    };

    static filterObject(obj, predicate){
        return Object.keys(obj)
          .filter( key => predicate(obj[key]) )
          .reduce( (res, key) => (res[key] = obj[key], res), {} );
    }
}

/**
 * Main class to handle 3D Dice animations.
 */
export class Dice3D {

    static get DEFAULT_OPTIONS() {
        return {
            enabled: true,
            hideAfterRoll: true,
            timeBeforeHide: 2000,
            hideFX: 'fadeOut',
            autoscale: true,
            scale: 75,
            speed: 1,
            shadowQuality: 'high',
            bumpMapping: true,
            sounds: true,
            soundsSurface: 'felt',
            soundsVolume: 0.5,
            canvasZIndex:'over',
            throwingForce:'medium',
            useHighDPI:true,
            showOthersSFX:true
        };
    }

    static DEFAULT_APPEARANCE(user = game.user) {
        return {
            global:{
                labelColor: Utils.contrastOf(user.color),
                diceColor: user.color,
                outlineColor: user.color,
                edgeColor: user.color,
                texture: "none",
                material: "auto",
                font:"auto",
                colorset: "custom",
                system: "standard"
            }
        };
    }

    static ALL_DEFAULT_OPTIONS(user = game.user) {
        return mergeObject(Dice3D.DEFAULT_OPTIONS, {appearance:Dice3D.DEFAULT_APPEARANCE(user)});
    }

    static get CONFIG() {
        let config = mergeObject(Dice3D.DEFAULT_OPTIONS, game.settings.get("dice-so-nice", "settings"));
        mergeObject(config,{ "-=appearance": null, "-=sfxLine":null });
        return config;
    }

    static APPEARANCE(user = game.user) {
        let userAppearance = user.getFlag("dice-so-nice", "appearance");
        let appearance = mergeObject(Dice3D.DEFAULT_APPEARANCE(user), userAppearance);
        return mergeObject(appearance, { "-=dimensions": null });
    }

    static SFX(user = game.user){
        if(Dice3D.CONFIG.showOthersSFX || user.id == game.user.id)
            return user.getFlag("dice-so-nice", "sfxList");
        else
            return {};
    }

    static ALL_CUSTOMIZATION(user = game.user) {
        let specialEffects = Dice3D.SFX(user);
        return mergeObject({appearance:Dice3D.APPEARANCE(user)}, {specialEffects: specialEffects});
    }

    static ALL_CONFIG(user = game.user) {
        let ret = mergeObject(Dice3D.CONFIG, {appearance:Dice3D.APPEARANCE(user)});
        ret.specialEffects = Dice3D.SFX(user);
        return ret;
    }

    /**
     * Register a new system
     * The id is to be used with addDicePreset
     * The name can be a localized string
     * @param {Object} system {id, name}
     * @param {Boolean} mode "force, exclusive, default". Force will prevent any other systems from being enabled. exclusive will list only "exclusive" systems in the dropdown . Default will add the system as a choice
     */
    addSystem(system, mode = "default") {
        //retrocompatibility with  API version < 3.1
        if(typeof mode == "boolean"){
            mode = mode ? "force":"default";
        }

        this.DiceFactory.addSystem(system, mode);
    }

    /**
     * Register a new dice preset
     * Type should be a known dice type (d4,d6,d8,d10,d12,d14,d16,d20,d24,d30,d100)
     * Labels contains either strings (unicode) or a path to a texture (png, gif, jpg, webp)
     * The texture file size should be 256*256
     * The system should be a system id already registered
     * @param {Object} dice {type:"",labels:[],system:""}
     */
    addDicePreset(dice, shape = null) {
        this.DiceFactory.addDicePreset(dice, shape);
    }

    /**
     * Add a texture to the list of textures and preload it
     * @param {String} textureID 
     * @param {Object} textureData 
     * @returns {Promise}
     */
    addTexture(textureID, textureData) {
        if (!textureData.bump)
            textureData.bump = '';
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
     * @param {Object} apply = "none", "default", "force"
     */
    async addColorset(colorset, apply = "none") {
        let defaultValues = {
            foreground:"custom",
            background:"custom",
            outline:"custom",
            edge:"custom",
            texture:"custom",
            material:"custom",
            font:"custom",
            fontScale:{},
            visibility:"visible"
        }
        colorset = mergeObject(defaultValues, colorset);
        COLORSETS[colorset.name] = colorset;
        DiceColors.initColorSets(colorset);

        if(colorset.font && !this.DiceFactory.fontFamilies.includes(colorset.font)){
            this.DiceFactory.fontFamilies.push(colorset.font);
            await this.DiceFactory._loadFonts();
		}

        switch (apply) {
            case "force":
                DiceColors.colorsetForced = colorset.name;
            //note: there's no break here on purpose 
            case "default":
                //If there's no apperance already selected by the player, save this custom colorset as his own
                let savedAppearance = game.user.getFlag("dice-so-nice", "appearance");
                if (!savedAppearance) {
                    let appearance = Dice3D.DEFAULT_APPEARANCE();
                    appearance.colorset = colorset.name;
                    game.user.setFlag("dice-so-nice", "appearance", appearance);
                }
        }
    }

    /**
     * Ctor. Create and initialize a new Dice3d.
     */
    constructor() {
        Hooks.call("diceSoNiceInit", this);
        game.dice3dRenderers = {
            "board":null,
            "showcase":null
        };
        this.hiddenAnimationQueue = [];
        this._buildCanvas();
        this._initListeners();
        this._buildDiceBox();
        DiceColors.loadTextures(TEXTURELIST, async (images) => {
            DiceColors.initColorSets();
            Hooks.call("diceSoNiceReady", this);
            await this.DiceFactory._loadFonts();
            await this.DiceFactory.preloadPresets();
        });
        DiceSFXManager.init();
        this._startQueueHandler();
        this._nextAnimationHandler();
        this._welcomeMessage();
    }

    get canInteract(){
        return !this.box.running;
    }

    /**
     * Create and inject the dice box canvas resizing to the window total size.
     *
     * @private
     */
    _buildCanvas() {
        this.canvas = $('<div id="dice-box-canvas" style="position: absolute; left: 0; top: 0;pointer-events: none;"></div>');
        if(Dice3D.CONFIG.canvasZIndex == "over"){
            this.canvas.css("z-index",1000);
            this.canvas.appendTo($('body'));
        } 
        else{
            $("#board").after(this.canvas);
        }
        this.currentCanvasPosition = Dice3D.CONFIG.canvasZIndex;
        this.currentBumpMapping =  Dice3D.CONFIG.bumpMapping;
        this.currentUseHighDPI = Dice3D.CONFIG.useHighDPI;
        this._resizeCanvas();
    }

    /**
     * resize to the window total size.
     *
     * @private
     */
    _resizeCanvas() {
        const sidebarWidth = $('#sidebar').width();
        const sidebarOffset = sidebarWidth > window.innerWidth / 2 ? 0 : sidebarWidth;
        this.canvas.width(window.innerWidth - sidebarOffset + 'px');
        this.canvas.height(window.innerHeight - 1 + 'px');
    }

    /**
     * Build the dicebox.
     *
     * @private
     */
    _buildDiceBox() {
        this.DiceFactory = new DiceFactory();
        let config = Dice3D.ALL_CONFIG();
        config.boxType = "board";
        this.box = new DiceBox(this.canvas[0], this.DiceFactory, config);
        this.box.initialize();
    }

    /**
     * Init listeners on windows resize and on click if auto hide has been disabled within the settings.
     *
     * @private
     */
    _initListeners() {
        this._rtime;
        this._timeout = false;
        $(window).resize(() => {
            this._rtime = new Date();
            if (this._timeout === false) {
                this._timeout = true;
                setTimeout(this._resizeEnd.bind(this), 1000);
            }
        });

        $(document).on("click",".dice-so-nice-btn-settings",(ev)=>{
            ev.preventDefault();
            const menu = game.settings.menus.get(ev.currentTarget.dataset.key);
            const app = new menu.type();
            return app.render(true);
        });

        game.socket.on('module.dice-so-nice', (request) => {
            switch(request.type){
                case "show":
                    if (!request.users || request.users.includes(game.user.id))
                        this.show(request.data, game.users.get(request.user));
                    break;
                case "update":
                    if(request.user == game.user.id || Dice3D.CONFIG.showOthersSFX)
                        DiceSFXManager.init();
                    if(request.user != game.user.id){
                        this.DiceFactory.preloadPresets(false, request.user);
                    }
                    break;
            }
        });

        if(game.settings.get("dice-so-nice", "allowInteractivity")){
            $(document).on("mousemove.dicesonice", "#board", this._onMouseMove.bind(this));

            $(document).on("mousedown.dicesonice", "#board", this._onMouseDown.bind(this));

            $(document).on("mouseup.dicesonice", "#board", this._onMouseUp.bind(this));
        }
    }

    _mouseNDC(event){
        let rect = this.canvas[0].getBoundingClientRect();
        let x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        if(x > 1)
            x = 1;
        let y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;
        return {x:x,y:y};
    }

    _onMouseMove(event){
        if(!this.canInteract)
            return;
        this.box.onMouseMove(event,this._mouseNDC(event));
    }

    _onMouseDown(event){
        if(!this.canInteract)
            return;
        let hit = this.box.onMouseDown(event,this._mouseNDC(event));
        if(hit)
            this._beforeShow();
        else{
            const config = Dice3D.CONFIG;
            if (!config.hideAfterRoll && this.canvas.is(":visible") && !this.box.rolling) {
                this.canvas.hide();
                this.box.clearAll();
            }
        }

    }

    _onMouseUp(event){
        if(!this.canInteract)
            return;
        let hit = this.box.onMouseUp(event);
        if(hit)
            this._afterShow();
    }

    _resizeEnd() {
        if (new Date() - this._rtime < 1000) {
            setTimeout(this._resizeEnd.bind(this), 1000);
        } else {
            this._timeout = false;
            //resize ended probably, lets remake the canvas
            this.canvas[0].remove();
            this.box.clearScene();
            this._buildCanvas();
            this._resizeCanvas();
            let config = Dice3D.ALL_CONFIG();
            config.boxType = "board";
            this.box = new DiceBox(this.canvas[0], this.DiceFactory, config);
            this.box.initialize();
            this.box.preloadSounds();
        }
    }

    /**
     * Start polling and watching te queue for animation requests.
     * Each request is resolved in sequence.
     *
     * @private
     */
    _startQueueHandler() {
        this.queue = [];
        setInterval(() => {
            if (this.queue.length > 0 && !this.box.rolling) {
                let animate = this.queue.shift();
                animate();
            }
        }, 100);
    }

    /**
     * Show a private message to new players
     */
    _welcomeMessage(){
        if(!game.user.getFlag("dice-so-nice","welcomeMessageShown")){
            if(!game.user.getFlag("dice-so-nice","appearance")){
                renderTemplate("modules/dice-so-nice/templates/welcomeMessage.html", {}).then((html)=>{
                    let options = {
                        whisper:[game.user.id],
                        content: html
                    };
                    ChatMessage.create(options);
                });
            }
            game.user.setFlag("dice-so-nice","welcomeMessageShown",true);
        }
        
    }

    /**
     * Check if 3D simulation is enabled from the settings.
     */
    isEnabled() {
        let combatEnabled = (!game.combat || !game.combat.started) || (game.combat && game.combat.started && !game.settings.get("dice-so-nice", "disabledDuringCombat"));
        return Dice3D.CONFIG.enabled && game.settings.get("dice-so-nice", "enabled") && combatEnabled;
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
     * Show the 3D Dice animation for the Roll made by the User.
     *
     * @param roll an instance of Roll class to show 3D dice animation.
     * @param user the user who made the roll (game.user by default).
     * @param synchronize if the animation needs to be synchronized for each players (true/false).
     * @param users list of users or userId who can see the roll, leave it empty if everyone can see.
     * @param blind if the roll is blind for the current user
     * @returns {Promise<boolean>} when resolved true if the animation was displayed, false if not.
     */
    showForRoll(roll, user = game.user, synchronize, users = null, blind, messageID = null) {
        let context = {
            roll:roll,
            user:user,
            users:users,
            blind:blind
        };
        Hooks.callAll("diceSoNiceRollStart", messageID, context);

        let notation = new DiceNotation(context.roll);
        return this.show(notation, context.user, synchronize, context.users, context.blind);
    }

    /**
     * Show the 3D Dice animation based on data configuration made by the User.
     *
     * @param data data containing the dice info.
     * @param user the user who made the roll (game.user by default).
     * @param synchronize
     * @param users list of users or userId who can see the roll, leave it empty if everyone can see.
     * @param blind if the roll is blind for the current user
     * @returns {Promise<boolean>} when resolved true if the animation was displayed, false if not.
     */
    show(data, user = game.user, synchronize = false, users = null, blind) {
        return new Promise((resolve, reject) => {

            if (!data.throws) throw new Error("Roll data should be not null");

            if (!data.throws.length || !this.isEnabled()) {
                resolve(false);
            } else {

                if (synchronize) {
                    users = users && users.length > 0 ? (users[0].id ? users.map(user => user.id) : users) : users;
                    game.socket.emit("module.dice-so-nice", { type:"show", data: data, user: user.id, users: users });
                }

                if (!blind) {
                    if(document.hidden){
                        this.hiddenAnimationQueue.push({
                            data:data,
                            config:Dice3D.ALL_CUSTOMIZATION(user),
                            timestamp:(new Date()).getTime(),
                            resolve:resolve
                        });
                    } else {
                        this._showAnimation(data, Dice3D.ALL_CUSTOMIZATION(user)).then(displayed => {
                            resolve(displayed);
                        });
                    }
                } else {
                    resolve(false);
                }
            }
            if(game.settings.get("dice-so-nice","immediatelyDisplayChatMessages")){
                resolve();
            }
        });
    }

    /**
     *
     * @param formula
     * @param results
     * @param dsnConfig
     * @returns {Promise<boolean>}
     * @private
     */
    _showAnimation(notation, dsnConfig) {
        notation.dsnConfig = dsnConfig;
        return new Promise((resolve, reject) => {
            this.nextAnimation.addItem({
                params : notation,
                resolve : resolve
            });
        });
    }

    _nextAnimationHandler(){
        let timing = game.settings.get("dice-so-nice", "enabledSimultaneousRolls") ? 400:0;
        this.nextAnimation = new Accumulator(timing, (items)=>{
            let commands = DiceNotation.mergeQueuedRollCommands(items);
            if (this.isEnabled() && this.queue.length < 10) {
                let count = commands.length;
                commands.forEach(aThrow => {
                    this.queue.push(() => {
                        this._beforeShow();
                        this.box.start_throw(aThrow, () => {
                            if (!--count) {
                                for(let item of items)
                                    item.resolve(true);
                                this._afterShow();
                            }
                        }
                        );
                    });
                });
            } else {
                for(let item of items)
                    item.resolve(false);
            }
        });
    }

    /**
     *
     * @private
     */
    _beforeShow() {
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
        }
        this.canvas.stop(true);
        this.canvas.show();
    }

    /**
     *
     * @private
     */
    _afterShow() {
        if (Dice3D.CONFIG.hideAfterRoll) {
            if(DiceSFXManager.renderQueue.length){
                clearTimeout(this.timeoutHandle);
                return;
            } else {
                this.timeoutHandle = setTimeout(() => {
                    if (!this.box.rolling) {
                        if (Dice3D.CONFIG.hideFX === 'none') {
                            this.canvas.hide();
                            this.box.clearAll();
                        }
                        if (Dice3D.CONFIG.hideFX === 'fadeOut') {
                        this.canvas.fadeOut({
                                duration: 1000,
                                complete: () => {
                                    this.box.clearAll();
                                },
                                fail: () => {
                                    this.canvas.fadeIn(0);
                                }
                            });
                        }
                    }
                }, Dice3D.CONFIG.timeBeforeHide);
            }
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

class Accumulator {
    constructor (delay, onEnd) {
        this._timeout = null;
        this._delay = delay;
        this._onEnd = onEnd;
        this._items = [];
    }

    addItem (item) {
        this._items.push(item);
        if(this._timeout)
            clearTimeout(this._timeout);
        let callback = function(){
            this._onEnd(this._items)
            this._timeout = null
            this._items = [];
        }.bind(this);
        if(this._delay)
            this._timeout = setTimeout(callback, this._delay);
        else
            callback();
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
            height: "auto",
            closeOnSubmit: true,
            tabs: [
                {navSelector: ".tabs", contentSelector: "#config-tabs", initial: "general"},
                {navSelector: ".dsn-appearance-tabs", contentSelector: "#dsn-appearance-content", initial: "global"}
            ]
        })
    }

    async getData(options) {
        let data = mergeObject({
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
            materialList: Utils.localize({
                "auto": "DICESONICE.MaterialAuto",
                "plastic": "DICESONICE.MaterialPlastic",
                "metal": "DICESONICE.MaterialMetal",
                "glass": "DICESONICE.MaterialGlass",
                "wood": "DICESONICE.MaterialWood",
                "chrome": "DICESONICE.MaterialChrome"
            }),
            fontList: Utils.prepareFontList(),
            colorsetList: Utils.prepareColorsetList(),
            shadowQualityList: Utils.localize({
                "none": "DICESONICE.None",
                "low": "DICESONICE.Low",
                "high": "DICESONICE.High"
            }),
            systemList: Utils.prepareSystemList(),
            soundsSurfaceList: Utils.localize({
                "felt": "DICESONICE.SurfaceFelt",
                "wood_table": "DICESONICE.SurfaceWoodTable",
                "wood_tray": "DICESONICE.SurfaceWoodTray",
                "metal": "DICESONICE.SurfaceMetal"
            }),
            canvasZIndexList: Utils.localize({
                "over": "DICESONICE.CanvasZIndexOver",
                "under": "DICESONICE.CanvasZIndexUnder",
            }),
            throwingForceList: Utils.localize({
                "weak": "DICESONICE.ThrowingForceWeak",
                "medium": "DICESONICE.ThrowingForceMedium",
                "strong": "DICESONICE.ThrowingForceStrong"
            }),
            specialEffectsMode:DiceSFXManager.SFX_MODE_LIST,
            specialEffects:Dice3D.SFX()
        },
            this.reset ? Dice3D.ALL_DEFAULT_OPTIONS() : Dice3D.ALL_CONFIG()
        );
        delete data.sfxLine;
        //fix corupted save from #139
        if(data.specialEffects){
            for (let [key, value] of Object.entries(data.specialEffects)) {
                if(Array.isArray(value.diceType) || Array.isArray(value.onResult) || Array.isArray(value.specialEffect))
                delete data.specialEffects[key];
            }
        }
        let tabsList = [];
        for (let scope in data.appearance) {
            if (data.appearance.hasOwnProperty(scope)) {
                tabsList.push(scope);
            }
        }
        
        let tabsAppearance = [];
        let tabsPromises = [];
        data.navAppearance = {};
        tabsList.forEach((diceType)=>{
            tabsPromises.push(renderTemplate("modules/dice-so-nice/templates/partial-appearance.html", {
                dicetype: diceType,
                appearance: data.appearance[diceType],
                systemList: data.systemList,
                colorsetList: data.colorsetList,
                textureList: data.textureList,
                materialList: data.materialList,
                fontList: data.fontList
            }).then((html)=>{
                tabsAppearance.push(html);
            }));
            if(diceType!="global")
                data.navAppearance[diceType] = diceType.toUpperCase();
        });
        await Promise.all(tabsPromises);

        if(tabsAppearance.length>1)
            data.displayHint = "style='display:none;'";
        else
            data.displayHint = '';

        data.tabsAppearance = tabsAppearance.join("");
        this.lastActiveAppearanceTab = "global";

        this.initializationData = data;
        this.currentGlobalAppearance = data.appearance.global;
        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);

        let canvas = document.getElementById('dice-configuration-canvas');
        let config = mergeObject(
            this.reset ? Dice3D.ALL_DEFAULT_OPTIONS() : Dice3D.ALL_CONFIG(),
            { dimensions: { w: 500, h: 245 }, autoscale: false, scale: 60, boxType:"showcase" }
        );

        this.box = new DiceBox(canvas, game.dice3d.box.dicefactory, config);
        this.box.initialize().then(()=>{
            this.box.showcase(config);

            this.toggleHideAfterRoll();
            this.toggleAutoScale();
            this.toggleCustomColors();
            this.toggleCustomization();
            this.filterSystems();

            this.navOrder = {};
            let i=0;
            this.box.diceList.forEach((el)=>{
                this.navOrder[el.userData] = i++;
            });



            this.reset = false;
        });

        $(this.element).on("change", ".dice-so-nice [data-hideAfterRoll]", (ev) =>{
            this.toggleHideAfterRoll(ev);
        });

        $(this.element).on("change", ".dice-so-nice [data-sounds]", (ev) =>{
            this.toggleSounds(ev);
        });

        $(this.element).on("change", ".dice-so-nice [data-autoscale]", (ev) =>{
            this.toggleAutoScale(ev);
        });

        $(this.element).on("change", ".dice-so-nice [data-colorset]", (ev) =>{
            this.toggleCustomColors($(ev.target).data("dicetype"));
        });

        $(this.element).on("change", ".dice-so-nice [data-system]", (ev) =>{
            this.toggleCustomization($(ev.target).data("dicetype"));
        });

        $(this.element).on("change", ".dice-so-nice input,.dice-so-nice select", (ev) =>{
            this.onApply(ev);
        });

        $(this.element).on("change", ".dice-so-nice [data-reset]", (ev) =>{
            this.onReset(ev);
        });

        $(this.element).on("click", ".dice-so-nice [data-close-tab]", (ev) =>{
            let diceType = $(ev.target).parent().data("tab");
            this.closeAppearanceTab(diceType);
        });

        $(this.element).on("click", ".dice-so-nice .sfx-list", (ev) =>{
            renderTemplate("modules/dice-so-nice/templates/partial-sfx.html", {
                id: $(".sfx-line").length,
                specialEffectsMode: DiceSFXManager.SFX_MODE_LIST
            }).then((html)=>{
                $("#sfxs-list").append(html);
                this.setPosition();
            });
        });

        $(this.element).on("click", ".dice-so-nice .sfx-delete", (ev)=>{
            $(ev.target).parents(".sfx-line").remove();
            $(".dice-so-nice .sfx-line").each(function(index){
                $(this).find("input, select").each(function(){
                    let name = $(this).attr("name");
                    $(this).attr("name", name.replace(/(\w+\[)(\d+)(\]\[\w+\])/, "$1"+index+"$3"));
                });
            });
            this.setPosition();
        });

        $(this.element).on("click", ".dice-so-nice #dice-configuration-canvas", (event)=>{
            let rect = event.target.getBoundingClientRect();
            let x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            if(x > 1)
                x = 1;
            let y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;
            let pos = {x:x,y:y};
            let dice = this.box.findShowcaseDie(pos);
            if(dice){
                let diceType = dice.object.userData;

                if($(`.dice-so-nice .dsn-appearance-tabs [data-tab="${diceType}"]`).length){
                    this.activateAppearanceTab(diceType);
                } else {
                    $(".dice-so-nice .dsn-appearance-hint").hide();
                    renderTemplate("modules/dice-so-nice/templates/partial-appearance.html", {
                        dicetype: diceType,
                        appearance: this.currentGlobalAppearance,
                        systemList: this.initializationData.systemList,
                        colorsetList: this.initializationData.colorsetList,
                        textureList: this.initializationData.textureList,
                        materialList: this.initializationData.materialList,
                        fontList: this.initializationData.fontList
                    }).then((html)=>{
                        let tabName = diceType.toUpperCase();
                        
                        let insertBefore = null;
                        //let's find where to insert the tab so it keeps the same order as the dice list
                        $(".dice-so-nice .dsn-appearance-tabs .item").each((index, el)=>{
                            if(this.navOrder[$(el).data("tab")] >= this.navOrder[diceType]){
                                insertBefore = $(el).data("tab");
                                return false;
                            }
                        });
                        let htmlNavString = `<span class="item" data-tab="${diceType}">${tabName} <i class="fas fa-times" data-close-tab></i></span>`;
                        if(insertBefore){
                            $(html).insertBefore(`.dice-so-nice .tabAppearance[data-tab="${insertBefore}"]`);
                            $(htmlNavString).insertBefore(`.dice-so-nice .dsn-appearance-tabs .item[data-tab="${insertBefore}"]`);
                        } else {
                            $(".dice-so-nice  #dsn-appearance-content").append(html);
                            $(".dice-so-nice .dsn-appearance-tabs").append(htmlNavString);
                        }
                        this.activateAppearanceTab(diceType);
                        this.toggleCustomColors(diceType);
                        this.toggleCustomization(diceType);
                        this.filterSystems(diceType);
                    });
                }
            }
        });
    }

    activateAppearanceTab(diceType) {
        let tabs = this._tabs[1];
        tabs.activate(diceType,{triggerCallback:true});
    }

    closeAppearanceTab(diceType){
        if(diceType=="global")
            return;
        let tabs = this._tabs[1];
        if(this._tabs[1].active == diceType)
            tabs.activate("global",{triggerCallback:true});

        $(`.dice-so-nice .tabAppearance[data-tab="${diceType}"]`).remove();
        $(`.dice-so-nice .dsn-appearance-tabs [data-tab="${diceType}"]`).remove();

        this.onApply();
    }

    _onChangeTab(event, tabs, active){
        super._onChangeTab(event, tabs, active);
        if(tabs._contentSelector == "#dsn-appearance-content"){
            if(this.lastActiveAppearanceTab != "global"){
                let appearanceArray = [];
                $(`.dice-so-nice .tabAppearance[data-tab="global"], .dice-so-nice .tabAppearance[data-tab="${this.lastActiveAppearanceTab}"]`).each((index, element) => {
                    let obj = {
                        labelColor: $(element).find('[data-labelColor]').val(),
                        diceColor: $(element).find('[data-diceColor]').val(),
                        outlineColor: $(element).find('[data-outlineColor]').val(),
                        edgeColor: $(element).find('[data-edgeColor]').val(),
                        colorset: $(element).find('[data-colorset]').val(),
                        texture: $(element).find('[data-texture]').val(),
                        material: $(element).find('[data-material]').val(),
                        font: $(element).find('[data-font]').val(),
                        system: $(element).find('[data-system]').val(),
                    };
                    appearanceArray.push(obj);
                });
                if(appearanceArray.length>1){
                    let diff = diffObject(appearanceArray[0],appearanceArray[1]);
                    if(isObjectEmpty(diff)){
                        this.closeAppearanceTab(this.lastActiveAppearanceTab)
                    }
                }
            }
            this.lastActiveAppearanceTab = active;
        }
    }

    toggleHideAfterRoll() {
        let hideAfterRoll = $('.dice-so-nice [data-hideAfterRoll]')[0].checked;
        $('.dice-so-nice [data-timeBeforeHide]').prop("disabled", !hideAfterRoll);
        $('.dice-so-nice [data-hideFX]').prop("disabled", !hideAfterRoll);
    }

    toggleSounds() {
        let sounds = $('.dice-so-nice [data-sounds]')[0].checked;
        $('.dice-so-nice [data-soundsSurface]').prop("disabled", !sounds);
        $('.dice-so-nice [data-soundsVolume]').prop("disabled", !sounds);
        //$('.sounds-range-value').css({ 'opacity': !sounds ? 0.4 : 1 });
    }

    toggleAutoScale() {
        let autoscale = $('.dice-so-nice [data-autoscale]')[0].checked;
        $('.dice-so-nice [data-scale]').prop("disabled", autoscale);
        //$('.scale-range-value').css({ 'opacity': autoscale ? 0.4 : 1 });
    }

    toggleCustomColors(dicetype) {
        let scope = $(".dice-so-nice .tabAppearance");
        if(dicetype){
            scope = scope.filter(`[data-tab="${dicetype}"]`);
        }
        scope.each((index, element) => {
            let colorset = $(element).find('[data-colorset]').val() !== 'custom';
            $(element).find('[data-labelColor]').prop("disabled", colorset);
            $(element).find('[data-diceColor]').prop("disabled", colorset);
            $(element).find('[data-outlineColor]').prop("disabled", colorset);
            $(element).find('[data-edgeColor]').prop("disabled", colorset);
            $(element).find('[data-labelColorSelector]').prop("disabled", colorset);
            $(element).find('[data-diceColorSelector]').prop("disabled", colorset);
            $(element).find('[data-outlineColorSelector]').prop("disabled", colorset);
            $(element).find('[data-edgeColorSelector]').prop("disabled", colorset);
        }); 
    }

    toggleCustomization(diceType = null){
        let container;
        if(diceType){
            container = $(`.dice-so-nice .tabAppearance[data-tab="${diceType}"]`);
        } else {
            container = $(`.dice-so-nice .tabAppearance`);
        }
         
        container.each((index, element)=>{
            let diceType = $(element).data("tab");
            if(diceType != "global"){
                let system = $(element).find('[data-system]').val();
                let customizationElements = $(element).find('[data-colorset],[data-texture],[data-material],[data-font]');
                if(system != "standard"){
                    let diceobj = this.box.dicefactory.systems[system].dice.find(obj => obj.type == diceType);
                    customizationElements.prop("disabled", (diceobj && (diceobj.modelFile || diceobj.colorset)));
                } else {
                    customizationElements.prop("disabled", false);
                }
            }
        });
    }

    filterSystems(diceType = null){
        let container;
        if(diceType){
            container = $(`.dice-so-nice .tabAppearance[data-tab="${diceType}"] [data-system]`);
        } else {
            container = $(`.dice-so-nice .tabAppearance [data-system]`);
        }
        container.each((index, element)=>{
            let diceType = $(element).data("dicetype");
            if(diceType != "global"){
                $(element).find("option").each((indexOpt, elementOpt)=>{
                    if(!this.box.dicefactory.systems[$(elementOpt).val()].dice.find(obj => obj.type == diceType))
                        $(elementOpt).attr("disabled","disabled");
                });
            }
        });
    }

    onApply(event = null) {
        if(event)
            event.preventDefault();

        setTimeout(() => {
            let config = {
                autoscale: false,
                scale: 60,
                shadowQuality: $('[data-shadowQuality]').val(),
                bumpMapping: $('[data-bumpMapping]').is(':checked'),
                sounds: $('[data-sounds]').is(':checked'),
                throwingForce:$('[data-throwingForce]').val(),
                useHighDPI:$('[data-useHighDPI]').is(':checked'),
                appearance:{}
            };
            $('.dice-so-nice .tabAppearance').each((index, element) => {
                config.appearance[$(element).data("tab")] = {
                    labelColor: $(element).find('[data-labelColor]').val(),
                    diceColor: $(element).find('[data-diceColor]').val(),
                    outlineColor: $(element).find('[data-outlineColor]').val(),
                    edgeColor: $(element).find('[data-edgeColor]').val(),
                    colorset: $(element).find('[data-colorset]').val(),
                    texture: $(element).find('[data-texture]').val(),
                    material: $(element).find('[data-material]').val(),
                    font: $(element).find('[data-font]').val(),
                    system: $(element).find('[data-system]').val(),
                };
            });
            this.currentGlobalAppearance = config.appearance.global;
            this.box.dicefactory.disposeCachedMaterials("showcase");
            this.box.update(config).then(()=>{
                this.box.showcase(config);
            });
        }, 100);
    }

    onReset() {
        this.reset = true;
        this.render();
    }

    parseInputs(data) {
        var ret = {};
        retloop:
        for (var input in data) {
            var val = data[input];
    
            var parts = input.split('[');       
            var last = ret;
    
            for (var i in parts) {
                var part = parts[i];
                if (part.substr(-1) == ']') {
                    part = part.substr(0, part.length - 1);
                }
    
                if (i == parts.length - 1) {
                    last[part] = val;
                    continue retloop;
                } else if (!last.hasOwnProperty(part)) {
                    last[part] = {};
                }
                last = last[part];
            }
        }
        return ret;
    }

    async _updateObject(event, formData) {
        //Remove custom settings if custom isn't selected to prevent losing them in the user save
        formData = this.parseInputs(formData);
        let sfxLine = formData.sfxLine;
        if(sfxLine){
            sfxLine = Object.values(sfxLine);
            //Remove empty lines
            for (let i= sfxLine.length -1; i>=0; i--) {
                if(sfxLine[i].diceType == "" || sfxLine[i].onResult == "")
                    sfxLine.splice(i,1);
            }
            //Remove duplicate lines
            let dataArr = sfxLine.map(item=>{
                return [JSON.stringify(item),item]
            });
            let mapArr = new Map(dataArr);
            
            sfxLine = [...mapArr.values()];

            delete formData.sfxLine;
        }

        for (let scope in formData.appearance) {
            if (formData.appearance.hasOwnProperty(scope)) {
                if(formData.appearance[scope].colorset != "custom"){
                    delete formData.appearance[scope].labelColor;
                    delete formData.appearance[scope].diceColor;
                    delete formData.appearance[scope].outlineColor;
                    delete formData.appearance[scope].edgeColor;
                }
            }
        }

        //required
        await game.user.unsetFlag("dice-so-nice", "sfxList");
        await game.user.unsetFlag("dice-so-nice", "appearance");

        
        let appearance = mergeObject(Dice3D.APPEARANCE(), formData.appearance, { insertKeys: false, insertValues: false });
        delete formData.appearance;
        let settings = mergeObject(Dice3D.CONFIG, formData, { insertKeys: false, insertValues: false });

        await game.settings.set('dice-so-nice', 'settings', settings);
        await game.user.setFlag("dice-so-nice", "appearance", appearance);
        await game.user.setFlag("dice-so-nice", "sfxList", sfxLine);

        game.socket.emit("module.dice-so-nice", { type: "update", user: game.user.id});
        DiceSFXManager.init();
        ui.notifications.info(game.i18n.localize("DICESONICE.saveMessage"));
    }

    close(options){
        super.close(options);
        this.box.clearScene();
		this.box.dicefactory.disposeCachedMaterials("showcase");
    }
}
