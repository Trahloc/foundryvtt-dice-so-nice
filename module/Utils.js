import { DiceColors, TEXTURELIST, COLORSETS } from './DiceColors.js';

/**
 * Generic utilities class...
 */
 export class Utils {

    /**
     * Migrate old 1.0 or 2.0 setting to new 4.0 format.
     */
    static async migrateOldSettings() {

        let formatversion = game.settings.get("dice-so-nice", "formatVersion");

        if (formatversion == "" || formatversion != "4.1") { //Never updated or first install
            if (!game.user.isGM) {
                ui.notifications.warn(game.i18n.localize("DICESONICE.migrateMessageNeedGM"));
                return false;
            }
        } else if (formatversion == "4.1") {
            return true;
        }
        let migrated = false;
        
        if(formatversion == ""){
            //v1 to v2
            let settings = game.settings.get("dice-so-nice", "settings");
            if (settings.diceColor || settings.labelColor) {
                let newSettings = mergeObject(Dice3D.DEFAULT_OPTIONS, settings, { insertKeys: false, insertValues: false });
                let appearance = mergeObject(Dice3D.DEFAULT_APPEARANCE(), settings, { insertKeys: false, insertValues: false });
                await game.settings.set("dice-so-nice", "settings", mergeObject(newSettings, { "-=dimensions": null, "-=fxList": null }));
                await game.user.setFlag("dice-so-nice", "appearance", appearance);
                migrated = true;
            }

            //v2 to v4
            await Promise.all(game.users.map(async (user) => {
                let appearance = user.getFlag("dice-so-nice", "appearance") ? duplicate(user.getFlag("dice-so-nice", "appearance")) : null;
                if (appearance && appearance.hasOwnProperty("labelColor")) {
                    let data = {
                        global: appearance
                    };
                    await user.unsetFlag("dice-so-nice", "appearance");
                    await user.setFlag("dice-so-nice", "appearance", data);
                    migrated = true;
                }

                let sfxList = user.getFlag("dice-so-nice", "sfxList") ? duplicate(user.getFlag("dice-so-nice", "sfxList")) : null;
            
                if(sfxList){
                    if(!Array.isArray(sfxList))
                        sfxList = Object.values(sfxList);
                    sfxList.forEach((sfx)=>{
                        sfx.onResult = [sfx.onResult];
                    });
                    await user.unsetFlag("dice-so-nice", "sfxList");
                    await user.setFlag("dice-so-nice", "sfxList", sfxList);
                    migrated = true;
                }
            }));
        }
        //v4 to v4.1 (fix)
        //Remove the extra properties, no idea why tho
        await Promise.all(game.users.map(async (user) => {
            let appearance = user.getFlag("dice-so-nice", "appearance") ? duplicate(user.getFlag("dice-so-nice", "appearance")) : null;
            if (appearance && appearance.hasOwnProperty("labelColor")) {
                let data = {
                    "-=colorset":null,
                    "-=diceColor":null,
                    "-=edgeColor":null,
                    "-=font":null,
                    "-=labelColor":null,
                    "-=material":null,
                    "-=outlineColor":null,
                    "-=system":null,
                    "-=texture":null
                };
                await user.setFlag("dice-so-nice", "appearance", data);
            }
        }));

        game.settings.set("dice-so-nice", "formatVersion", "4.1");
        if(migrated)
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
        let groupedSetsList = Object.values(COLORSETS);
        groupedSetsList.sort((set1, set2) => {
            if (game.i18n.localize(set1.description) < game.i18n.localize(set2.description)) return -1;
            if (game.i18n.localize(set1.description) > game.i18n.localize(set2.description)) return 1;
        });
        let preparedList = {};
        for (let i = 0; i < groupedSetsList.length; i++) {
            if (groupedSetsList[i].visibility == 'hidden')
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

    static filterObject(obj, predicate) {
        return Object.keys(obj)
            .filter(key => predicate(obj[key]))
            .reduce((res, key) => (res[key] = obj[key], res), {});
    }
}
