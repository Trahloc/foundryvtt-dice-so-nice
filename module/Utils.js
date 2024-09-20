import { TEXTURELIST, COLORSETS } from './DiceColors.js';
/**
 * Generic utilities class...
 */
 export class Utils {

    static DATA_FORMAT_VERSION = "4.2";
    /**
     * Migrate old 1.0 or 2.0 setting to new 4.2 format.
     */
    static async migrateOldSettings() {

        //migrate settings to flags. This is a scoped migration, no GM needed
        let userSettings = game.settings.get("dice-so-nice", "settings");
        if(userSettings.hasOwnProperty("enabled")){
            await game.user.setFlag("dice-so-nice", "settings", userSettings);
            await game.settings.set("dice-so-nice","settings",{});
        }

        let formatversion = game.settings.get("dice-so-nice", "formatVersion");

        if (formatversion == "" || formatversion != Utils.DATA_FORMAT_VERSION) { //Never updated or first install
            if (!game.user.isGM) {
                ui.notifications.warn(game.i18n.localize("DICESONICE.migrateMessageNeedGM"));
                return false;
            }
        } else if (formatversion == "4.1") {
            //Fuck it, lets do this so I'm sure it it not because of DsN itself.
            if (game.user.isGM) {
                await Promise.all(game.users.map(async (user) => {
                    let appearance = user.getFlag("dice-so-nice", "appearance") ? foundry.utils.duplicate(user.getFlag("dice-so-nice", "appearance")) : null;
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
            } else {
                let appearance = game.user.getFlag("dice-so-nice", "appearance") ? foundry.utils.duplicate(game.user.getFlag("dice-so-nice", "appearance")) : null;
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
                    await game.user.setFlag("dice-so-nice", "appearance", data);
                }
            }
            return true;
        }
        let migrated = false;
        
        if(formatversion == ""){
            //v1 to v2
            let settings = game.user.getFlag("dice-so-nice", "settings") ? foundry.utils.duplicate(game.user.getFlag("dice-so-nice", "settings")):{};
            if (settings.diceColor || settings.labelColor) {
                let newSettings = foundry.utils.mergeObject(game.dice3d.constructor.DEFAULT_OPTIONS, settings, { insertKeys: false, insertValues: false,performDeletions:true });
                let appearance = foundry.utils.mergeObject(game.dice3d.constructor.DEFAULT_APPEARANCE(), settings, { insertKeys: false, insertValues: false,performDeletions:true});
                await game.settings.set("dice-so-nice", "settings", foundry.utils.mergeObject(newSettings, { "-=dimensions": null, "-=fxList": null },{performDeletions:true}));
                await game.user.setFlag("dice-so-nice", "appearance", appearance);
                migrated = true;
            }

            //v2 to v4
            await Promise.all(game.users.map(async (user) => {
                let appearance = user.getFlag("dice-so-nice", "appearance") ? foundry.utils.duplicate(user.getFlag("dice-so-nice", "appearance")) : null;
                if (appearance && appearance.hasOwnProperty("labelColor")) {
                    let data = {
                        global: appearance
                    };
                    await user.unsetFlag("dice-so-nice", "appearance");
                    await user.setFlag("dice-so-nice", "appearance", data);
                    migrated = true;
                }

                let sfxList = user.getFlag("dice-so-nice", "sfxList") ? foundry.utils.duplicate(user.getFlag("dice-so-nice", "sfxList")) : null;
            
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
            let appearance = user.getFlag("dice-so-nice", "appearance") ? foundry.utils.duplicate(user.getFlag("dice-so-nice", "appearance")) : null;
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

        //v4.1 to v4.2
        //showGhostDice is now a string with 3 values. 0, 1 or 2
        //If the setting was previously false, set it to 0. If it was true, set it to 1
        await game.settings.set("dice-so-nice", "showGhostDice", game.settings.get("dice-so-nice", "showGhostDice") ? '1' : '0');


        game.settings.set("dice-so-nice", "formatVersion", Utils.DATA_FORMAT_VERSION);
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

        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);

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
        return foundry.utils.mergeObject(fontList,FontConfig.getAvailableFontChoices());
    };

    static prepareColorsetList() {
        let colorsetList = Object.entries(COLORSETS).reduce((colorsetObj, [key, colorset]) => {
            if (colorset.visibility !== 'hidden') {
                colorsetObj[key] = Object.assign({}, colorset, { label:game.i18n.localize(colorset.description), group: game.i18n.localize(colorset.category) });
            }
            return colorsetObj;
        }, {});

        return Object.fromEntries(Object.entries(colorsetList).sort((a,b) => a[1].label.localeCompare(b[1].label)));
    };

    static prepareSystemList() {
        let systems = game.dice3d.box.dicefactory.systems;
        return [...systems.values()].sort((systemA, systemB) => {
            // Direct comparison since we're now working directly with the values
            if (systemA.id === "standard") {
                return -1;
            } else if (systemB.id === "standard") {
                return 1;
            } else if (systemA.group === systemB.group) {
                return systemA.name.localeCompare(systemB.name);
            } else if (systemA.group === null) {
                return 1;
            } else if (systemB.group === null) {
                return -1;
            } else {
                return systemA.group.localeCompare(systemB.group);
            }
        }).reduce((i18nCfg, system) => {
            // Use system.id as the key for i18nCfg
            i18nCfg[system.id] = { label: game.i18n.localize(system.name), group: system.group };
            return i18nCfg;
        }, {});
    }

    static filterObject(obj, predicate) {
        return Object.keys(obj)
            .filter(key => predicate(obj[key]))
            .reduce((res, key) => (res[key] = obj[key], res), {});
    }

    static actionSaveAs(name){
        let savesObject = game.user.getFlag("dice-so-nice", "saves");
        let saves;
        if (!savesObject) {
            saves = new Map();
        } else {
            //workaround for https://gitlab.com/foundrynet/foundryvtt/-/issues/5464
            saves = new Map(Object.entries(savesObject));
        }
        //save current settings first
        
        let saveObject = {
            appearance: game.user.getFlag("dice-so-nice", "appearance"),
            sfxList: game.user.getFlag("dice-so-nice", "sfxList"),
            settings: game.settings.get("dice-so-nice", "settings")
        };

        saves.set(name, saveObject);
        game.user.unsetFlag("dice-so-nice", "saves").then(() => {
            game.user.setFlag("dice-so-nice", "saves", Object.fromEntries(saves));
        });
    }

    static async actionDeleteSave(name){
        let savesObject = game.user.getFlag("dice-so-nice", "saves");
        let saves = new Map(Object.entries(savesObject));
        saves.delete(name);
        game.user.unsetFlag("dice-so-nice", "saves").then(async () => {
            await game.user.setFlag("dice-so-nice", "saves", Object.fromEntries(saves));
            ui.notifications.info(game.i18n.localize("DICESONICE.saveMessage"));
        });
    }

    static async actionLoadSave(name) {
        let savesObject = game.user.getFlag("dice-so-nice", "saves");
        let save = new Map(Object.entries(savesObject)).get(name);

        if (save.appearance) {
            await game.user.unsetFlag("dice-so-nice", "appearance");
            await game.user.setFlag("dice-so-nice", "appearance", save.appearance);
        }
        if (save.sfxList) {
            await game.user.unsetFlag("dice-so-nice", "sfxList");
            await game.user.setFlag("dice-so-nice", "sfxList", save.sfxList);
        }
        if (save.settings) {
            await game.user.unsetFlag("dice-so-nice", "settings");
            await game.user.setFlag("dice-so-nice", "settings", save.settings);
        }
    }
}
