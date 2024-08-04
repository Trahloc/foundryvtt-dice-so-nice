export class DiceSystem {
    static SETTING_SCOPE = {
        LOCAL: 0, // User specific settings that is not shared with other players
        SHARED: 1 // User specific settings that is shared with other players
    }

    static SETTING_TYPE = {
        BOOLEAN: "boolean",
        SELECT: "select",
        COLOR: "color",
        FILE: "file",
        RANGE: "range",
        STRING: "string",
        SEPARATOR: "separator"
    }

    /**
     * Creates a new instance of the DiceSystem class.
     *
     * @param {string} id - The unique identifier for the dice system.
     * @param {string} name - The name of the dice system.
     * @param {Map} [dice=null] - A map of dice for the dice system.
     * @param {string} [mode="default"] - The mode of the dice system.
     * @param {string|null} [group=null] - The group the dice system belongs to.
     */
    constructor(id, name, mode = "default", group = null) {
        this._id = id;
        this._name = name;
        this._dice = new Map();
        this._mode = mode;
        this._group = group;

        this._settings = [];
    }

    get id() {
        return this._id;
    }

    get name() {
        return this._name;
    }

    get dice() {
        return this._dice;
    }

    get mode() {
        return this._mode;
    }

    get group() {
        return this._group;
    }

    get settings() {
        return this._settings.filter((setting) => setting.type !== DiceSystem.SETTING_TYPE.SEPARATOR);
    }

    /**
     * Updates the material of the dice objects in the system.
     *
     * @param {string|null} [diceType=null] - The type of dice to update. If null, all dice will be updated.
     * @return {void}
     */
    updateMaterial(diceType = null) {
        for (const [key, dice] of this.dice) {
            if (diceType && dice.type !== diceType) {
                continue;
            }

            if (dice.model) {
                dice.model.scene.traverse((child) => {
                    if (child.isMaterial) {
                        child.needsUpdate = true;
                    }
                });
            } else {
                for (const cacheEntry of game.dice3d.DiceFactory.baseTextureCache) {
                    if (cacheEntry.userData?.diceobj?.system == this.id) {
                        cacheEntry.needsUpdate = true;
                    }
                }
            }
        }
    }

    /**
     * Creates a setting object with the specified type, id, name, scope, value, and additional properties.
     *
     * @param {string} type - The type of the setting.
     * @param {string} id - The unique identifier of the setting.
     * @param {string} name - The name of the setting.
     * @param {string} scope - The scope of the setting.
     * @param {any} value - The value of the setting.
     * @param {Object} [additionalProperties={}] - Additional properties to be added to the setting object.
     * @return {Object} The created setting object.
     */
    _createSetting(type, id, name, scope, defaultValue, additionalProperties = {}) {
        //field checks
        if(!Object.values(DiceSystem.SETTING_TYPE).includes(type)) {
            throw new Error(`Invalid setting type: ${type}`);
        }

        if(!Object.values(DiceSystem.SETTING_SCOPE).includes(scope)) {
            throw new Error(`Invalid setting scope: ${scope}`);
        }

        if(type != DiceSystem.SETTING_TYPE.SEPARATOR){
            if (!id) {
                throw new Error(`Invalid setting id: ${id}`);
            }

            if (!name) {
                throw new Error(`Invalid setting name: ${name}`);
            }
        }

        this._settings.push({
            type,
            id,
            name,
            defaultValue,
            scope: scope,
            ...additionalProperties
        });
    }

    /**
     * Adds a visual separator with an optional title.
     *
     * @param {Object} args - The options for the separator.
     * @param {string} [args.name=""] - The title to display
     * @return {void}
     */
    addSettingSeparator({ name = "" } = {}) {
        this._createSetting("separator", null, name, DiceSystem.SETTING_SCOPE.LOCAL, null);
    }

    /**
     * Adds a boolean setting
     *
     * @param {Object} args - The arguments object.
     * @param {string} args.id - The unique identifier for the setting.
     * @param {string} args.name - The name of the setting.
     * @param {string} args.scope - The scope of the setting.
     * @param {boolean} [args.defaultValue=false] - The default value of the setting.
     * @return {void}
     */
    addSettingBoolean({ id, name, scope, defaultValue = false }) {
        this._createSetting("boolean", id, name, scope, defaultValue);
    }

    /**
     * Adds a color setting
     *
     * @param {Object} args - The arguments object.
     * @param {string} args.id - The unique identifier for the setting.
     * @param {string} args.name - The name of the setting.
     * @param {string} args.scope - The scope of the setting.
     * @param {string} [args.defaultValue=null] - The default value of the setting, in hex format, e.g. "#ffffff".
     * @return {void}
     */
    addSettingColor({ id, name, scope, defaultValue = "#ffffff" }) {
        this._createSetting("color", id, name, scope, defaultValue);
    }

    /**
     * Adds a range setting
     *
     * @param {Object} args - The arguments object.
     * @param {string} args.id - The unique identifier for the setting.
     * @param {string} args.name - The name of the setting.
     * @param {string} args.scope - The scope of the setting.
     * @param {number} [args.defaultValue=0] - The default value of the setting.
     * @param {number} [args.min=0] - The minimum value of the setting.
     * @param {number} [args.max=100] - The maximum value of the setting.
     * @param {number} [args.step=1] - The step value of the setting.
     * @return {void}
     */
    addSettingRange({ id, name, scope, defaultValue = 0, min = 0, max = 100, step = 1 }) {
        this._createSetting("range", id, name, scope, defaultValue, { min, max, step });
    }

    /**
     * Adds a file setting
     *
     * @param {Object} args - The arguments object.
     * @param {string} args.id - The unique identifier for the setting.
     * @param {string} args.name - The name of the setting.
     * @param {string} args.scope - The scope of the setting.
     * @param {string|null} [args.defaultValue=null] - The default value of the setting.
     * @return {void}
     */
    addSettingFile({ id, name, scope, defaultValue = "" }) {
        // Make sure defaultValue is a string)
        defaultValue = defaultValue || "";
        this._createSetting("file", id, name, scope, defaultValue);
    }

    /**
     * Adds a select setting
     *
     * @param {Object} args - The arguments object.
     * @param {string} args.id - The unique identifier for the setting.
     * @param {string} args.name - The name of the setting.
     * @param {string} args.scope - The scope of the setting.
     * @param {string|null} [args.defaultValue=null] - The default value of the setting.
     * @param {Object} [args.options={}] - The options for the select setting.
     * @param {string} args.options.id - The unique identifier for the option.
     * @param {string} args.options.label - The label for the option.
     * @param {string} [args.options.group=null] - The group for the option.
     * @return {void}
     */
    addSettingSelect({ id, name, scope, defaultValue = null, options = {} }) {
        this._createSetting("select", id, name, scope, defaultValue, { options });
    }

    /**
     * Adds a string setting.
     *
     * @param {Object} options - The options for the setting.
     * @param {string} options.id - The unique identifier for the setting.
     * @param {string} options.name - The name of the setting.
     * @param {string} options.scope - The scope of the setting.
     * @param {string|null} [options.defaultValue=null] - The default value of the setting.
     * @return {void}
     */
    addSettingString({ id, name, scope, defaultValue = "" }) {
        // Make sure defaultValue is a string
        defaultValue = defaultValue || "";
        this._createSetting("string", id, name, scope, defaultValue);
    }

    /**
     * Retrieves a dice object from the dice array based on the given shape and values.
     *
     * @param {string} shape - The shape of the dice.
     * @param {Array} values - The values of the dice.
     * @return {Object|null} The dice object if found, or null if not found.
     */
    getDiceByShapeAndValues(shape, values) {
        for (let dice of this.dice.values()) {
            if (dice.shape == shape && dice.values.length == values.length) {
                return dice;
            }
        }
        return null;
    }

    /**
     * Generates the HTML content and data for a settings dialog line based on the provided setting.
     *
     * @param {Object} setting - The setting object containing the type, id, name, and value.
     * @return {Object} An object containing the HTML content and data for the settings dialog line.
     */
    getSettingsDialogLine(setting) {
        let line = {
            content: "",
            data: {}
        };
        switch (setting.type) {
            case DiceSystem.SETTING_TYPE.BOOLEAN:
                line.content = `
                    <div class="form-group">
                        <label>${setting.name}</label>
                        <div class="form-fields">
                            <input type="checkbox" name="systemSettings[${this.id}][${setting.id}]" data-dtype="Boolean" {{checked ${setting.id}.value}} />
                        </div>
                    </div>
                `;

                line.data = {
                    value: setting.defaultValue
                };
                break;
            case DiceSystem.SETTING_TYPE.STRING:
                line.content = `
                    <div class="form-group">
                        <label>${setting.name}</label>
                        <div class="form-fields">
                            <input type="text" name="systemSettings[${this.id}][${setting.id}]" value="{{${setting.id}.value}}" data-dtype="String" />
                        </div>
                    </div>
                `;

                line.data = {
                    value: setting.defaultValue
                };
                break;
            case DiceSystem.SETTING_TYPE.COLOR:
                line.content = `
                    <div class="form-group">
                        <label>${setting.name}</label>
                        <div class="form-fields">
                            <input type="text" data-colorpicker name="systemSettings[${this.id}][${setting.id}]" value="{{${setting.id}.value}}" data-dtype="String" />
                            <input type="color" name="systemSettings[${this.id}][${setting.id}Selector]" value="{{${setting.id}.value}}"
                                data-edit="systemSettings[${this.id}][${setting.id}]" data-${setting.id}Selector />
                        </div>
                    </div>
                `;

                line.data = {
                    value: setting.defaultValue
                };
                break;
            case DiceSystem.SETTING_TYPE.RANGE:
                line.content = `
                    <div class="form-group">
                        <label>${setting.name}</label>
                        <div class="form-fields">
                            <input type="range" name="systemSettings[${this.id}][${setting.id}]" value="{{${setting.id}.value}}" min="{{${setting.id}.min}}" max="{{${setting.id}.max}}" step="{{${setting.id}.step}}" data-dtype="Number">
                            <span class="range-value">{{${setting.id}.value}}</span>
                        </div>
                    </div>
                `;

                line.data = {
                    value: setting.defaultValue,
                    min: setting.min,
                    max: setting.max,
                    step: setting.step
                };
                break;
            case DiceSystem.SETTING_TYPE.FILE:
                line.content = `
                    <div class="form-group">
                        <label>${setting.name}</label>
                        <div class="form-fields">
                            <input type="file" name="systemSettings[${this.id}][${setting.id}]" value="{{${setting.id}.value}}"
                                data-edit="systemSettings[${this.id}][${setting.id}]" data-${setting.id} />
                        </div>
                    </div>
                `;

                line.data = {
                    value: setting.defaultValue
                };
                break;
            case DiceSystem.SETTING_TYPE.SELECT:
                line.content = `
                    <div class="form-group">
                        <label>${setting.name}</label>
                        <div class="form-fields">
                            <select name="systemSettings[${this.id}][${setting.id}]" data-dtype="String">
                                {{selectOptions ${setting.id}.options selected=${setting.id}.value}}
                            </select>
                        </div>
                    </div>
                `;

                line.data = {
                    value: setting.defaultValue,
                    options: setting.options
                };
                break;
            case DiceSystem.SETTING_TYPE.SEPARATOR:
                if(setting.name != "")
                    line.content = `<h2>${setting.name}</h2>`;
                else
                    line.content = `<hr />`;
                break;
        }

        return line;
    }

    getSettingsDialogContent() {
        let dialogContent = {
            content: "",
            data: {}
        };

        if(!this._settings.length) return dialogContent;

        // generate the content and data for each setting
        for (let setting of this._settings) {
            let line = this.getSettingsDialogLine(setting);
            dialogContent.content += line.content;
            dialogContent.data[setting.id] = line.data;
        }

        dialogContent.content = `<div data-systemSettings="${this.id}">${dialogContent.content}</div>`;

        return dialogContent;
    }
}
