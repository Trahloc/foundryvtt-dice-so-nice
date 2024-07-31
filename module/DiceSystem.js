export class DiceSystem {
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
     * Adds a boolean setting to the settings array.
     *
     * @param {string} id - The unique identifier for the setting.
     * @param {string} name - The name of the setting.
     * @param {boolean} [value=false] - The default value of the setting.
     * @return {void}
     */
    addSettingBoolean(id, name, value = false) {
        this._settings.push({
            id: id,
            type: "boolean",
            name: name,
            value: value
        });
    }

    /**
     * Adds a color setting to the settings array.
     *
     * @param {string} id - The unique identifier for the setting.
     * @param {string} name - The name of the setting.
     * @param {string} [value=null] - The default value of the setting.
     * @return {void}
     */
    addSettingColor(id, name, value = null) {
        this._settings.push({
            id: id,
            type: "color",
            name: name,
            value: value
        });
    }

    /**
     * Adds a range setting to the settings array.
     *
     * @param {string} id - The unique identifier for the setting.
     * @param {string} name - The name of the setting.
     * @param {number} [value=0] - The default value of the setting.
     * @param {number} [min=0] - The minimum value of the setting.
     * @param {number} [max=100] - The maximum value of the setting.
     * @param {number} [step=1] - The step value of the setting.
     * @return {void}
     */
    addSettingRange(id, name, value = 0, min = 0, max = 100, step = 1) {
        this._settings.push({
            id: id,
            type: "range",
            name: name,
            value: value,
            min: min,
            max: max,
            step: step
        });
    }

    /**
     * Adds a file setting to the settings array.
     *
     * @param {string} id - The unique identifier for the setting.
     * @param {string} name - The name of the setting.
     * @param {string|null} [value=null] - The default value of the setting.
     */
    addSettingFile(id, name, value = null) {
        this._settings.push({
            id: id,
            type: "file",
            name: name,
            value: value
        });
    }

    /**
     * Adds a select setting to the settings array.
     *
     * @param {string} id - The unique identifier for the setting.
     * @param {string} name - The name of the setting.
     * @param {string|null} [value=null] - The default value of the setting.
     * @param {Object} [options={}] - The options for the select setting.
     * @param {string} options.id - The unique identifier for the option.
     * @param {string} options.label - The label for the option.
     * @param {string} [options.group=null] - The group for the option.
     */
    addSettingSelect(id, name, value = null, options = {}) {
        //options should be an object of ids with a value of {label, group} with group being optional and the property being the id
        //i.e.: { yes: { label: "Yes!", group: "Group 1" }, no: { label: "Nooo" } }
        this._settings.push({
            id: id,
            type: "select",
            name: name,
            value: value,
            options: options
        });
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
            case "boolean":
                line.content = `
                    <div class="form-group">
                        <label>${setting.name}</label>
                        <div class="form-fields">
                            <input type="checkbox" name="systemSettings[${this.id}][${setting.id}]" data-dtype="Boolean" {{checked ${setting.id}.value}} />
                        </div>
                    </div>
                `;

                line.data = {
                    value: setting.value
                };
                break;
            case "color":
                line.content = `
                    <div class="form-group">
                        <label>${setting.name}</label>
                        <div class="form-fields">
                            <input type="text" name="systemSettings[${this.id}][${setting.id}]" value="{{${setting.id}.value}}" data-dtype="String" />
                            <input type="color" name="systemSettings[${this.id}][${setting.id}Selector]" value="{{${setting.id}.value}}"
                                data-edit="systemSettings[${this.id}][${setting.id}]" data-${setting.id}Selector />
                        </div>
                    </div>
                `;

                line.data = {
                    value: setting.value
                };
                break;
            case "range":
                line.content = `
                    <div class="form-group">
                        <label>${setting.name}</label>
                        <div class="form-fields">
                            <input type="range" name="systemSettings[${this.id}][${setting.id}]" value="{{${setting.id}.value}}" min="{{${setting.id}.min}}" max="{{${setting.id}.max}}" step="{{${setting.id}.step}}" data-dtype="Number">
                            <span class="range-value">${setting.value}</span>
                        </div>
                    </div>
                `;

                line.data = {
                    value: setting.value,
                    min: setting.min,
                    max: setting.max,
                    step: setting.step
                };
                break;
            case "file":
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
                    value: setting.value
                };
                break;
            case "select":
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
                    value: setting.value,
                    options: setting.options
                };
                break;
        }

        return line;
    }

    getSettingsDialogContent() {
        if(this._settings.length === 0) return null;

        let dialogContent = {
            content: "",
            data: {}
        };
        
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
