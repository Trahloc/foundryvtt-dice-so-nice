import { DiceFactory } from './DiceFactory.js';
import { DiceBox } from './DiceBox.js';
import { DiceColors, TEXTURELIST, COLORSETS } from './DiceColors.js';
import { DiceNotation } from './DiceNotation.js';
import { DiceSFXManager } from './DiceSFXManager.js';
import { Accumulator } from './Accumulator.js';
import { Utils } from './Utils.js';
import { ThinFilmFresnelMap } from './libs/ThinFilmFresnelMap.js';
import { TextureLoader } from 'three';
import { DiceTourMain } from './tours/DiceTourMain.js';
/**
 * Main class to handle 3D Dice animations.
 */
export class Dice3D {

    static get DEFAULT_OPTIONS() {
        return {
            enabled: true,
            showExtraDice: game.dice3d && game.dice3d.hasOwnProperty("defaultShowExtraDice") ? game.dice3d.defaultShowExtraDice : false,
            hideAfterRoll: true,
            timeBeforeHide: 2000,
            hideFX: 'fadeOut',
            autoscale: true,
            scale: 75,
            speed: 1,
            imageQuality: "high",
            shadowQuality: 'high',
            bumpMapping: true,
            sounds: true,
            soundsSurface: 'felt',
            soundsVolume: 0.5,
            canvasZIndex: 'over',
            throwingForce: 'medium',
            useHighDPI: true,
            antialiasing: game.canvas.app.renderer.context.webGLVersion === 2 ? "msaa" : "smaa",
            glow: true,
            showOthersSFX: true,
            immersiveDarkness: true,
            muteSoundSecretRolls: false,
            enableFlavorColorset: true,
            rollingArea: false
        };
    }

    static DEFAULT_APPEARANCE(user = game.user) {
        return {
            global: {
                labelColor: Utils.contrastOf(user.color),
                diceColor: user.color,
                outlineColor: user.color,
                edgeColor: user.color,
                texture: "none",
                material: "auto",
                font: "auto",
                colorset: "custom",
                system: "standard"
            }
        };
    }

    static ALL_DEFAULT_OPTIONS(user = game.user) {
        let options = mergeObject(Dice3D.DEFAULT_OPTIONS, { appearance: Dice3D.DEFAULT_APPEARANCE(user) }, { performDeletions: true });
        options.appearance.global.system = game.dice3d.DiceFactory.preferredSystem;
        options.appearance.global.colorset = game.dice3d.DiceFactory.preferredColorset;
        return options;
    }

    static CONFIG(user = game.user) {
        let userSettings = user.getFlag("dice-so-nice", "settings") ? duplicate(user.getFlag("dice-so-nice", "settings")) : null;
        let config = mergeObject(Dice3D.DEFAULT_OPTIONS, userSettings, { performDeletions: true });
        mergeObject(config, { "-=appearance": null, "-=sfxLine": null }, { performDeletions: true });
        return config;
    }

    static APPEARANCE(user = game.user) {
        let userAppearance = user.getFlag("dice-so-nice", "appearance") ? duplicate(user.getFlag("dice-so-nice", "appearance")) : null;
        let appearance = mergeObject(Dice3D.DEFAULT_APPEARANCE(user), userAppearance, { performDeletions: true });
        return mergeObject(appearance, { "-=dimensions": null }, { performDeletions: true });
    }

    static SFX(user = game.user) {
        let sfxArray;
        if (Dice3D.CONFIG().showOthersSFX || user.id == game.user.id)
            sfxArray = user.getFlag("dice-so-nice", "sfxList") ? duplicate(user.getFlag("dice-so-nice", "sfxList")) : [];
        else
            sfxArray = [];
        if (!Array.isArray(sfxArray)) {
            sfxArray = [];
        }
        return sfxArray;
    }

    /**
     * Get the full customizations settings for the _showAnimation method 
     */
    static ALL_CUSTOMIZATION(user = game.user, dicefactory = null) {
        let specialEffects = Dice3D.SFX(user) || [];
        game.users.forEach((other) => {
            if (other.isGM && other.id != user.id) {
                let GMSFX = Dice3D.SFX(other);
                if (Array.isArray(GMSFX)) {
                    GMSFX = GMSFX.filter(sfx => sfx.options && sfx.options.isGlobal);
                    specialEffects = specialEffects.concat(GMSFX);
                }
            }
        });
        let config = mergeObject({ appearance: Dice3D.APPEARANCE(user) }, { specialEffects: specialEffects }, { performDeletions: true });
        if (dicefactory && !game.user.getFlag("dice-so-nice", "appearance")) {
            if (dicefactory.preferredSystem != "standard")
                config.appearance.global.system = dicefactory.preferredSystem;
            if (dicefactory.preferredColorset != "custom")
                config.appearance.global.colorset = dicefactory.preferredColorset;
        }
        return config;
    }

    static ALL_CONFIG(user = game.user) {
        let ret = mergeObject(Dice3D.CONFIG(user), { appearance: Dice3D.APPEARANCE(user) }, { performDeletions: true });
        ret.specialEffects = Dice3D.SFX(user);
        return ret;
    }

    /**
     * Register a new system
     * The id is to be used with addDicePreset
     * The name can be a localized string
     * @param {Object} system {id, name}
     * @param {Boolean} mode "default,preferred". Default will add the system as a choice. Preferred will be enabled for all users unless they change their settings.
     */
    addSystem(system, mode = "default") {
        //retrocompatibility with  API version < 3.1
        if (typeof mode == "boolean") {
            mode = mode ? "preferred" : "default";
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
     * @param {Object} mode = "default", "preferred"
     */
    async addColorset(colorset, mode = "default") {
        let defaultValues = {
            foreground: "custom",
            background: "custom",
            outline: "",
            edge: "",
            texture: "custom",
            material: "custom",
            font: "custom",
            visibility: "visible"
        }
        colorset = mergeObject(defaultValues, colorset, { performDeletions: true });
        COLORSETS[colorset.name] = colorset;
        DiceColors.initColorSets(colorset);

        if (colorset.font && !FontConfig.getAvailableFonts().includes(colorset.font)) {
            await FontConfig.loadFont(colorset.font, { editor: false, fonts: [] });
        }
        if (mode == "preferred")
            this.DiceFactory.preferredColorset = colorset.name;
    }

    /**
     * Add a new type if SFX trigger that can be customized by users.
     * This trigger can then be pulled by a system, a module or a macro
     * @param {String} id : Identifier of the trigger, ex: fate3df
     * @param {String} name : Localized name of the trigger, ex: Fate Roll
     * @param {Array(String)} results : Array of possible results for this trigger, ex: ["-3","3","0"]
     */
    addSFXTrigger(id, name, results) {
        if (DiceSFXManager.EXTRA_TRIGGER_RESULTS[id])
            return;
        DiceSFXManager.EXTRA_TRIGGER_TYPE.push({ id: id, name: name });
        DiceSFXManager.EXTRA_TRIGGER_RESULTS[id] = [];
        results.forEach((res) => {
            DiceSFXManager.EXTRA_TRIGGER_RESULTS[id].push({ id: res, name: res });
        });
    }

    /**
     * Load a save file by its name
     * @param {String} name 
     * @returns {Promise}
     */
    async loadSaveFile(name) {
        if (game.user.getFlag("dice-so-nice", "saves").hasOwnProperty(name))
            await Utils.actionLoadSave(name);
    }


    /**
     * Constructor. Create and initialize a new Dice3d.
     */
    constructor() {
        Hooks.call("diceSoNiceInit", this);
        this.dice3dRenderers = {
            "board": null,
            "showcase": null
        };

        this.exports = {
            "Utils": Utils,
            "DiceColors": DiceColors,
            "TEXTURELIST": TEXTURELIST,
            "COLORSETS": COLORSETS
        };

        this.uniforms = {
            globalBloom: { value: 1 },
            bloomStrength: { value: 2.5 },
            bloomRadius: { value: 0.5 },
            bloomThreshold: { value: 0.03 },
            iridescenceLookUp: { value: new ThinFilmFresnelMap() },
            iridescenceNoise: { value: new TextureLoader().load("modules/dice-so-nice/textures/noise-thin-film.webp") },
            boost: { value: 1.5 }
        };

        this.hiddenAnimationQueue = [];
        this.defaultShowExtraDice = Dice3D.DEFAULT_OPTIONS.showExtraDice;
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
        this._registerTours();
    }

    get canInteract() {
        return !this.box.running;
    }

    /**
     * Create and inject the dice box canvas resizing to the window total size.
     *
     * @private
     */
    _buildCanvas() {
        const config = Dice3D.CONFIG();
        const sidebarWidth = $('#sidebar').width();
        const sidebarOffset = sidebarWidth > window.innerWidth / 2 ? 0 : sidebarWidth;
        const area = config.rollingArea ? config.rollingArea : {
            left: 0,
            top: 0,
            width: window.innerWidth - sidebarOffset,
            height: window.innerHeight - 1
        };

        this.canvas = $(`<div id="dice-box-canvas" style="position: absolute; left: ${area.left}px; top: ${area.top}px; pointer-events: none;"></div>`);
        if (config.canvasZIndex === "over") {
            this.canvas.css("z-index", 1000);
            this.canvas.appendTo($('body'));
        }
        else {
            $("#board").after(this.canvas);
        }
        this.canvas.width(area.width + 'px');
        this.canvas.height(area.height + 'px');
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

        $(document).on("click", ".dice-so-nice-btn-settings", (ev) => {
            ev.preventDefault();
            const menu = game.settings.menus.get(ev.currentTarget.dataset.key);
            const app = new menu.type();
            return app.render(true);
        });

        $(document).on("click", ".dice-so-nice-btn-tour", (ev) => {
            ev.preventDefault();
            game.tours.get("dice-so-nice.dice-so-nice-tour").start();
        });

        game.socket.on('module.dice-so-nice', (request) => {
            switch (request.type) {
                case "show":
                    if (!request.users || request.users.includes(game.user.id))
                        this.show(request.data, game.users.get(request.user));
                    break;
                case "update":
                    if (request.user == game.user.id || Dice3D.CONFIG().showOthersSFX)
                        DiceSFXManager.init();
                    if (request.user != game.user.id) {
                        this.DiceFactory.preloadPresets(false, request.user);
                    }
                    break;
            }
        });

        if (game.settings.get("dice-so-nice", "allowInteractivity")) {
            $(document).on("mousemove.dicesonice", "body", this._onMouseMove.bind(this));

            $(document).on("mousedown.dicesonice", "body", this._onMouseDown.bind(this));

            $(document).on("mouseup.dicesonice", "body", this._onMouseUp.bind(this));
        }
    }

    _mouseNDC(event) {
        let rect = this.canvas[0].getBoundingClientRect();
        let x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        if (x > 1)
            x = 1;
        let y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;
        return { x: x, y: y };
    }

    _onMouseMove(event) {
        if (!this.canInteract)
            return;
        this.box.onMouseMove(event, this._mouseNDC(event));
    }

    _onMouseDown(event) {
        if (!this.canInteract)
            return;
        let hit = this.box.onMouseDown(event, this._mouseNDC(event));
        if (hit)
            this._beforeShow();
        else {
            const config = Dice3D.CONFIG();
            if (!config.hideAfterRoll && this.canvas.is(":visible") && !this.box.rolling) {
                this.canvas.hide();
                this.box.clearAll();
            }
        }

    }

    _onMouseUp(event) {
        if (!this.canInteract)
            return;
        let hit = this.box.onMouseUp(event);
        if (hit)
            this._afterShow();
    }

    _resizeEnd() {
        if (new Date() - this._rtime < 1000) {
            setTimeout(this._resizeEnd.bind(this), 1000);
        } else {
            this._timeout = false;
            //resize ended probably, lets remake the canvas
            this.resizeAndRebuild();
        }
    }

    resizeAndRebuild() {
        this.canvas[0].remove();
        this.box.clearScene();
        this._buildCanvas();
        let config = Dice3D.ALL_CONFIG();
        config.boxType = "board";
        this.box = new DiceBox(this.canvas[0], this.DiceFactory, config);
        this.box.initialize();
        this.box.preloadSounds();
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
    _welcomeMessage() {
        if (!game.user.getFlag("dice-so-nice", "welcomeMessageShown")) {
            if (!game.user.getFlag("dice-so-nice", "appearance")) {
                const content = [`
                <div class="dice-so-nice">
                    <h3 class="nue">${game.i18n.localize("DICESONICE.WelcomeTitle")}</h3>
                    <p class="nue">${game.i18n.localize("DICESONICE.WelcomeMessage1")}</p>
                    <p class="nue">${game.i18n.localize("DICESONICE.WelcomeMessage2")}</p>
                    <p>
                        <button type="button" class="dice-so-nice-btn-settings" data-key="dice-so-nice.dice-so-nice">
                            <i class="fas fa-dice-d20"></i> ${game.i18n.localize("DICESONICE.configTitle")}
                        </button>
                    </p>
                    <p class="nue">${game.i18n.localize("DICESONICE.WelcomeMessage3")}</p>
                    <p class="nue">${game.i18n.localize("DICESONICE.WelcomeMessageTour")}</p>
                    <p>
                        <button type="button" class="dice-so-nice-btn-tour" data-tour="dice-so-nice-tour">
                            <i class="fas fa-hiking"></i> ${game.i18n.localize("DICESONICE.WelcomeMessageTourBtn")}
                        </button>
                    </p>
                    <p class="nue">${game.i18n.localize("DICESONICE.WelcomeMessage4")}</p>
                    <footer class="nue">${game.i18n.localize("NUE.FirstLaunchHint")}</footer>
                </div>
                `];
                const chatData = content.map(c => {
                    return {
                        whisper: [game.user.id],
                        speaker: { alias: "Dice So Nice!" },
                        flags: { core: { canPopout: true } },
                        content: c
                    };
                });
                ChatMessage.implementation.createDocuments(chatData);
            }
            game.user.setFlag("dice-so-nice", "welcomeMessageShown", true);
        }
    }

    /**
     * Register the tours to the Tour Manager
     */
    _registerTours() {
        game.tours.register("dice-so-nice", "dice-so-nice-tour", new DiceTourMain());
    }

    /**
     * Check if 3D simulation is enabled from the settings.
     */
    isEnabled() {
        let combatEnabled = (!game.combat || !game.combat.started) || (game.combat && game.combat.started && !game.settings.get("dice-so-nice", "disabledDuringCombat"));
        return Dice3D.CONFIG().enabled && combatEnabled;
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
     * Parse, sort and add the dice animation to the queue for a chat message and an array of Roll
     * Used internally by the message Hooks. Not meant to be used outside of the module.
     * Please use the showForRoll method instead.
     * @param {ChatMessage} chatMessage 
     * @param {Array<Roll>} rolls 
     */
    renderRolls(chatMessage, rolls) {
        const showMessage = () => {
            delete chatMessage._dice3danimating;

            window.ui.chat.element.find(`.message[data-message-id="${chatMessage.id}"]`).show().find(".dice-roll").show();
            if (window.ui.sidebar.popouts.chat)
                window.ui.sidebar.popouts.chat.element.find(`.message[data-message-id="${chatMessage.id}"]`).show().find(".dice-roll").show();;

            Hooks.callAll("diceSoNiceRollComplete", chatMessage.id);

            window.ui.chat.scrollBottom({ popout: true });
        }

        if (game.view == "stream" && !game.modules.get("0streamutils")?.active) {
            setTimeout(showMessage, 2500, chatMessage);
        } else {
            //1- We create a list of all 3D rolls, ordered ASC
            //2- We create a Roll object with the correct formula and results
            //3- We queue the showForRoll calls and then show the message
            let orderedDiceList = [[]];
            rolls.forEach(roll => {
                roll.dice.forEach(diceTerm => {
                    let index = 0;
                    if (!game.settings.get("dice-so-nice", "enabledSimultaneousRollForMessage") && diceTerm.options.hasOwnProperty("rollOrder")) {
                        index = diceTerm.options.rollOrder;
                        if (orderedDiceList[index] == null) {
                            orderedDiceList[index] = [];
                        }
                    }
                    orderedDiceList[index].push(diceTerm);
                });
            });
            orderedDiceList = orderedDiceList.filter(el => el != null);

            let rollList = [];
            const plus = new OperatorTerm({ operator: "+" }).evaluate();
            orderedDiceList.forEach(dice => {
                //add a "plus" between each term
                if (Array.isArray(dice) && dice.length) {
                    let termList = [...dice].map((e, i) => i < dice.length - 1 ? [e, plus] : [e]).reduce((a, b) => a.concat(b));
                    //We use the Roll class registered in the CONFIG constant in case the system overwrites it (eg: HeXXen)
                    rollList.push(CONFIG.Dice.rolls[0].fromTerms(termList));
                }
            });

            //call each promise one after the other, then call the showMessage function
            const recursShowForRoll = (rollList, index) => {
                this.showForRoll(rollList[index], chatMessage.user, false, null, false, chatMessage.id, chatMessage.speaker).then(() => {
                    index++;
                    if (rollList[index] != null)
                        recursShowForRoll(rollList, index);
                    else
                        showMessage();
                });
            };

            recursShowForRoll(rollList, 0);
        }
    }

    /**
     * Show the 3D Dice animation for the Roll made by the User.
     *
     * @param roll an instance of Roll class to show 3D dice animation.
     * @param user the user who made the roll (game.user by default).
     * @param synchronize if the animation needs to be sent and played for each players (true/false).
     * @param users list of users or userId who can see the roll, leave it empty if everyone can see.
     * @param blind if the roll is blind for the current user
     * @param messageID ChatMessage related to this roll (default: null)
     * @param speaker Object based on the ChatSpeakerData data schema related to this roll. Useful to fully support DsN settings like "hide npc rolls". (Default: null)
     * @returns {Promise<boolean>} when resolved true if the animation was displayed, false if not.
     */
    showForRoll(roll, user = game.user, synchronize, users = null, blind, messageID = null, speaker = null) {
        let context = {
            roll: roll,
            user: user,
            users: users,
            blind: blind
        };
        if (speaker) {
            let actor = game.actors.get(speaker.actor);
            const isNpc = actor ? actor.type === 'npc' : false;
            if (isNpc && game.settings.get("dice-so-nice", "hideNpcRolls")) {
                return Promise.resolve(false);
            }
        }
        let chatMessage = game.messages.get(messageID);
        if (chatMessage) {
            if (chatMessage.whisper.length > 0)
                context.roll.secret = true;
            if (!chatMessage.isContentVisible)
                context.roll.ghost = true;
        }


        Hooks.callAll("diceSoNiceRollStart", messageID, context);
        let notation = new DiceNotation(context.roll, Dice3D.ALL_CONFIG(user));
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
                    users = users && users.length > 0 ? (users[0]?.id ? users.map(user => user.id) : users) : users;
                    game.socket.emit("module.dice-so-nice", { type: "show", data: data, user: user.id, users: users });
                }

                if (!blind) {
                    if (document.hidden) {
                        this.hiddenAnimationQueue.push({
                            data: data,
                            config: Dice3D.ALL_CUSTOMIZATION(user, this.DiceFactory),
                            timestamp: (new Date()).getTime(),
                            resolve: resolve
                        });
                    } else {
                        this._showAnimation(data, Dice3D.ALL_CUSTOMIZATION(user, this.DiceFactory)).then(displayed => {
                            resolve(displayed);
                        });
                    }
                } else {
                    resolve(false);
                }
            }
            if (game.settings.get("dice-so-nice", "immediatelyDisplayChatMessages")) {
                resolve();
            }
        });
    }

    /**
     * Change the default value of the showExtraDice settings
     * @param {Boolean} show 
     */
    showExtraDiceByDefault(show = true) {
        this.defaultShowExtraDice = show;
    }

    /**
     * Helper function to detect the end of a 3D animation for a message
     * @param {ChatMessage.ID} targetMessageId 
     * @returns Promise<boolean>
     */
    waitFor3DAnimationByMessageID(targetMessageId) {
        function buildHook(resolve) {
            Hooks.once('diceSoNiceRollComplete', (messageId) => {
                if (targetMessageId === messageId)
                    resolve(true);
                else
                    buildHook(resolve)
            });
        }
        return new Promise((resolve, reject) => {
            if (game.dice3d && game.user.getFlag("dice-so-nice", "settings").enabled) {
                buildHook(resolve);
            } else {
                resolve(true);
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
                params: notation,
                resolve: resolve
            });
        });
    }

    _nextAnimationHandler() {
        let timing = game.settings.get("dice-so-nice", "enabledSimultaneousRolls") ? 400 : 0;
        this.nextAnimation = new Accumulator(timing, (items) => {
            let commands = DiceNotation.mergeQueuedRollCommands(items);
            if (this.isEnabled() && this.queue.length < 10) {
                let count = commands.length;
                commands.forEach(aThrow => {
                    this.queue.push(() => {
                        this._beforeShow();
                        this.box.start_throw(aThrow, () => {
                            if (!--count) {
                                for (let item of items)
                                    item.resolve(true);
                                this._afterShow();
                            }
                        }
                        );
                    });
                });
            } else {
                for (let item of items)
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
        if (Dice3D.CONFIG().hideAfterRoll) {
            if (DiceSFXManager.renderQueue.length) {
                clearTimeout(this.timeoutHandle);
                return;
            } else {
                this.timeoutHandle = setTimeout(() => {
                    if (!this.box.rolling) {
                        if (Dice3D.CONFIG().hideFX === 'none') {
                            this.canvas.hide();
                            this.box.clearAll();
                        }
                        if (Dice3D.CONFIG().hideFX === 'fadeOut') {
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
                }, Dice3D.CONFIG().timeBeforeHide);
            }
        }
    }
}