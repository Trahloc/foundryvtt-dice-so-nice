export class Accumulator {
    constructor(delay, onEnd) {
        this._timeout = null;
        this._delay = delay;
        this._onEnd = onEnd;
        this._items = [];
    }

    async addItem(item) {
        this._items.push(item);
        if (this._timeout)
            clearTimeout(this._timeout);
        let callback = async () => {
            await this._onEnd(this._items)
            this._timeout = null
            this._items = [];
        };
        if (this._delay)
            this._timeout = setTimeout(callback, this._delay);
        else
            await callback();
    }
}
