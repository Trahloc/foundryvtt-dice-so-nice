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
    constructor(id, name, dice = null, mode = "default", group = null) {
        this._id = id;
        this._name = name;
        this._dice = dice || new Map();
        this._mode = mode;
        this._group = group;
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

    getDiceByShapeAndValues(shape, values) {
        for(let dice of this.dice.values()) {
            if(dice.shape == shape && dice.values.length == values.length) {
                return dice;
            }
        }
        return null;
    }
}
