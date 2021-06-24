import { DiceFactory } from './DiceFactory.js';
import { DiceBox } from './DiceBox.js';
import { DiceColors, TEXTURELIST, COLORSETS } from './DiceColors.js';
import { DiceNotation } from './DiceNotation.js';
import { DiceSFXManager } from './DiceSFXManager.js';
import { Accumulator } from './Accumulator.js';
import { Utils } from './Utils.js';
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
            canvasZIndex: 'over',
            throwingForce: 'medium',
            useHighDPI: true,
            showOthersSFX: true
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
        return mergeObject(Dice3D.DEFAULT_OPTIONS, { appearance: Dice3D.DEFAULT_APPEARANCE(user) });
    }

    static get CONFIG() {
        let config = mergeObject(Dice3D.DEFAULT_OPTIONS, game.settings.get("dice-so-nice", "settings"));
        mergeObject(config, { "-=appearance": null, "-=sfxLine": null });
        return config;
    }

    static APPEARANCE(user = game.user) {
        let userAppearance = user.getFlag("dice-so-nice", "appearance") ? duplicate(user.getFlag("dice-so-nice", "appearance")) : null;
        let appearance = mergeObject(Dice3D.DEFAULT_APPEARANCE(user), userAppearance);
        return mergeObject(appearance, { "-=dimensions": null });
    }

    static SFX(user = game.user) {
        if (Dice3D.CONFIG.showOthersSFX || user.id == game.user.id)
            return user.getFlag("dice-so-nice", "sfxList") ? duplicate(user.getFlag("dice-so-nice", "sfxList")) : null;
        else
            return {};
    }

    static ALL_CUSTOMIZATION(user = game.user, dicefactory = null) {
        let specialEffects = Dice3D.SFX(user);
        let config = mergeObject({ appearance: Dice3D.APPEARANCE(user) }, { specialEffects: specialEffects });
        if (dicefactory && dicefactory.preferedSystem != "standard" && !game.user.getFlag("dice-so-nice", "appearance")) {
            config.appearance.global.system = dicefactory.preferedSystem;
        }
        return config;
    }

    static ALL_CONFIG(user = game.user) {
        let ret = mergeObject(Dice3D.CONFIG, { appearance: Dice3D.APPEARANCE(user) });
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
        if (typeof mode == "boolean") {
            mode = mode ? "force" : "default";
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
            foreground: "custom",
            background: "custom",
            outline: "custom",
            edge: "custom",
            texture: "custom",
            material: "custom",
            font: "custom",
            fontScale: {},
            visibility: "visible"
        }
        colorset = mergeObject(defaultValues, colorset);
        COLORSETS[colorset.name] = colorset;
        DiceColors.initColorSets(colorset);

        if (colorset.font && !this.DiceFactory.fontFamilies.includes(colorset.font)) {
            this.DiceFactory.fontFamilies.push(colorset.font);
            await this.DiceFactory._loadFonts();
        }

        switch (apply) {
            case "force":
                DiceColors.colorsetForced = colorset.name;
            //note: there's no break here on purpose 
            case "default":
                //If there's no apperance already selected by the player, save this custom colorset as his own
                let savedAppearance = game.user.getFlag("dice-so-nice", "appearance") ? duplicate(game.user.getFlag("dice-so-nice", "appearance")) : null;
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
            "board": null,
            "showcase": null
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

    get canInteract() {
        return !this.box.running;
    }

    /**
     * Create and inject the dice box canvas resizing to the window total size.
     *
     * @private
     */
    _buildCanvas() {
        this.canvas = $('<div id="dice-box-canvas" style="position: absolute; left: 0; top: 0;pointer-events: none;"></div>');
        if (Dice3D.CONFIG.canvasZIndex == "over") {
            this.canvas.css("z-index", 1000);
            this.canvas.appendTo($('body'));
        }
        else {
            $("#board").after(this.canvas);
        }
        this.currentCanvasPosition = Dice3D.CONFIG.canvasZIndex;
        this.currentBumpMapping = Dice3D.CONFIG.bumpMapping;
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

        $(document).on("click", ".dice-so-nice-btn-settings", (ev) => {
            ev.preventDefault();
            const menu = game.settings.menus.get(ev.currentTarget.dataset.key);
            const app = new menu.type();
            return app.render(true);
        });

        game.socket.on('module.dice-so-nice', (request) => {
            switch (request.type) {
                case "show":
                    if (!request.users || request.users.includes(game.user.id))
                        this.show(request.data, game.users.get(request.user));
                    break;
                case "update":
                    if (request.user == game.user.id || Dice3D.CONFIG.showOthersSFX)
                        DiceSFXManager.init();
                    if (request.user != game.user.id) {
                        this.DiceFactory.preloadPresets(false, request.user);
                    }
                    break;
            }
        });

        if (game.settings.get("dice-so-nice", "allowInteractivity")) {
            $(document).on("mousemove.dicesonice", "#board", this._onMouseMove.bind(this));

            $(document).on("mousedown.dicesonice", "#board", this._onMouseDown.bind(this));

            $(document).on("mouseup.dicesonice", "#board", this._onMouseUp.bind(this));
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
            const config = Dice3D.CONFIG;
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
    _welcomeMessage() {
        if (!game.user.getFlag("dice-so-nice", "welcomeMessageShown")) {
            if (!game.user.getFlag("dice-so-nice", "appearance")) {
                renderTemplate("modules/dice-so-nice/templates/welcomeMessage.html", {}).then((html) => {
                    let options = {
                        whisper: [game.user.id],
                        content: html
                    };
                    ChatMessage.create(options);
                });
            }
            game.user.setFlag("dice-so-nice", "welcomeMessageShown", true);
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
        if(speaker){
            let actor = game.actors.get(speaker.actor);
            const isNpc = actor ? actor.data.type === 'npc' : false;
            if (isNpc && game.settings.get("dice-so-nice", "hideNpcRolls")) {
                return false;
            }
        }
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
        if (Dice3D.CONFIG.hideAfterRoll) {
            if (DiceSFXManager.renderQueue.length) {
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