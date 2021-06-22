import { Dice3D } from './Dice3D.js';
import { DiceBox } from './DiceBox.js';
import { DiceSFXManager } from './DiceSFXManager.js';
import { Utils } from './Utils.js';
import { DiceNotation } from './DiceNotation.js';
/**
 * Form application to configure settings of the 3D Dice.
 */
 export class DiceConfig extends FormApplication {

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: game.i18n.localize("DICESONICE.configTitle"),
            id: "dice-config",
            template: "modules/dice-so-nice/templates/dice-config.html",
            width: 650,
            height: "auto",
            closeOnSubmit: true,
            tabs: [
                { navSelector: ".tabs", contentSelector: "#config-tabs", initial: "general" },
                { navSelector: ".dsn-appearance-tabs", contentSelector: "#dsn-appearance-content", initial: "global" }
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
            specialEffectsMode: DiceSFXManager.SFX_MODE_LIST,
            specialEffects: Dice3D.SFX()
        },
            this.reset ? Dice3D.ALL_DEFAULT_OPTIONS() : Dice3D.ALL_CONFIG()
        );
        delete data.sfxLine;
        //fix corupted save from #139
        if (data.specialEffects) {
            for (let [key, value] of Object.entries(data.specialEffects)) {
                if (Array.isArray(value.diceType) || Array.isArray(value.onResult) || Array.isArray(value.specialEffect))
                    delete data.specialEffects[key];
            }
        }
        let tabsList = [];
        for (let scope in data.appearance) {
            if (data.appearance.hasOwnProperty(scope)) {
                tabsList.push(scope);
                if (scope != "global") {
                    if (!data.appearance[scope].labelColor)
                        data.appearance[scope].labelColor = data.appearance.global.labelColor;
                    if (!data.appearance[scope].diceColor)
                        data.appearance[scope].diceColor = data.appearance.global.diceColor;
                    if (!data.appearance[scope].outlineColor)
                        data.appearance[scope].outlineColor = data.appearance.global.outlineColor;
                    if (!data.appearance[scope].edgeColor)
                        data.appearance[scope].edgeColor = data.appearance.global.edgeColor;
                }
            }
        }

        let tabsAppearance = [];
        let tabsPromises = [];
        data.navAppearance = {};
        tabsList.forEach((diceType) => {
            tabsPromises.push(renderTemplate("modules/dice-so-nice/templates/partial-appearance.html", {
                dicetype: diceType,
                appearance: data.appearance[diceType],
                systemList: data.systemList,
                colorsetList: data.colorsetList,
                textureList: data.textureList,
                materialList: data.materialList,
                fontList: data.fontList
            }).then((html) => {
                tabsAppearance.push(html);
            }));
            if (diceType != "global")
                data.navAppearance[diceType] = diceType.toUpperCase();
        });
        await Promise.all(tabsPromises);

        if (tabsAppearance.length > 1)
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
            { dimensions: { w: 634, h: 245 }, autoscale: false, scale: 60, boxType: "showcase" }
        );



        this.box = new DiceBox(canvas, game.dice3d.box.dicefactory, config);
        this.box.initialize().then(() => {
            if (this.box.dicefactory.preferedSystem != "standard" && !game.user.getFlag("dice-so-nice", "appearance")) {
                config.appearance.global.system = this.box.dicefactory.preferedSystem;
            }
            this.box.showcase(config);

            this.toggleHideAfterRoll();
            this.toggleAutoScale();
            this.toggleCustomization();
            this.filterSystems();
            this.setPreferedSystem();

            this.navOrder = {};
            let i = 0;
            this.box.diceList.forEach((el) => {
                this.navOrder[el.userData] = i++;
            });



            this.reset = false;
        });

        $(this.element).on("change", "[data-hideAfterRoll]", (ev) => {
            this.toggleHideAfterRoll(ev);
        });

        $(this.element).on("change", "[data-sounds]", (ev) => {
            this.toggleSounds(ev);
        });

        $(this.element).on("change", "[data-autoscale]", (ev) => {
            this.toggleAutoScale(ev);
        });

        $(this.element).on("change", "[data-colorset]", (ev) => {
            this.toggleCustomColors($(ev.target).data("dicetype"));
        });

        $(this.element).on("change", "[data-system]", (ev) => {
            this.toggleCustomization($(ev.target).data("dicetype"));
        });

        $(this.element).on("change", "input,select", (ev) => {
            this.onApply(ev);
        });

        $(this.element).on("change", "[data-reset]", (ev) => {
            this.onReset(ev);
        });

        $(this.element).on("click", "[data-cancel]", (ev) => {
            this.close();
        });

        $(this.element).on("click", "[data-close-tab]", (ev) => {
            let diceType = $(ev.target).parent().data("tab");
            this.closeAppearanceTab(diceType);
        });

        $(this.element).on("click", "[data-test]", (ev) => {
            let config = this.getShowcaseAppearance();
            let denominationList = [];
            this.box.diceList.forEach((el) => {
                //the d100 will roll the d10 so we remove the d10 from the list
                if(el.userData != "d10")
                    denominationList.push(el.userData);
            });
            let roll = new Roll(denominationList.join("+")).roll();
            let data = new DiceNotation(roll);

            let specialEffects = [];
            let customization = mergeObject({ appearance: config.appearance }, { specialEffects: specialEffects });
            
            game.dice3d._showAnimation(data, customization);
        });

        $(this.element).on("click", ".sfx-create", (ev) => {
            renderTemplate("modules/dice-so-nice/templates/partial-sfx.html", {
                id: $(".sfx-line").length,
                specialEffectsMode: DiceSFXManager.SFX_MODE_LIST
            }).then((html) => {
                $("#sfxs-list").append(html);
                this.setPosition();
            });
        });

        $(this.element).on("click", ".sfx-delete", (ev) => {
            $(ev.target).parents(".sfx-line").remove();
            $(this.element).find(".sfx-line").each(function (index) {
                $(this).find("input, select").each(function () {
                    let name = $(this).attr("name");
                    $(this).attr("name", name.replace(/(\w+\[)(\d+)(\]\[\w+\])/, "$1" + index + "$3"));
                });
            });
            this.setPosition();
        });

        /**
         * Save As
         */
        $(this.element).on("click", "[data-saveas]", async (ev) => {
            let saves = game.user.getFlag("dice-so-nice","saves");
            let saveList = [];
            if(saves)
                saveList = new Map(Object.entries(saves));

            let dialogSaveAs = new Dialog({
                title: game.i18n.localize("DICESONICE.SaveAs"),
                width: 550,
                content: await renderTemplate("modules/dice-so-nice/templates/dialog-saveas.html",
                    {
                        saveList: saveList.keys()
                    }),
                buttons:{},
                render: html => {
                    if(saveList.size){
                        $(html).on("click","[data-overwrite]", (ev)=>{
                            let name = $(html).find("[data-save-list]").val();
                            this.actionSaveAs(name);
                            dialogSaveAs.close();
                        });

                        $(html).on("click","[data-delete]", async (ev)=>{
                            let name = $(html).find("[data-save-list]").val();
                            await this.actionDeleteSave(name);
                            saveList.delete(name);
                            $(html).find("[data-save-list] option:selected").remove();
                            if(!saveList.size){
                                $(html).find("[data-overwrite]").prop("disabled",true);
                                $(html).find("[data-delete]").prop("disabled",true);
                            }
                        });

                    } else {
                        $(html).find("[data-overwrite]").prop("disabled",true);
                        $(html).find("[data-delete]").prop("disabled",true);
                    }

                    $(html).on("click","[data-add-new]", (ev)=>{
                        let name = $(html).find("[data-save-name]").val();
                        if(name){
                            if(saveList.has(name)){
                                ui.notifications.error(game.i18n.localize("DICESONICE.SaveAsErrorAlreadyExist"));
                            } else {
                                this.actionSaveAs(name);
                                dialogSaveAs.close();
                            }
                        }
                        else
                            ui.notifications.error(game.i18n.localize("DICESONICE.SaveAsErrorName"));
                    });
                }
            }, {
                width: 450,
                classes: ["dice-so-nice"]
            }).render(true);
        });

        /**
         * Load
         */
        $(this.element).on("click", "[data-load]", async (ev) => {
            let saves = game.user.getFlag("dice-so-nice","saves");
            let saveList = [];
            if(saves)
                saveList = new Map(Object.entries(saves));

            new Dialog({
                title: game.i18n.localize("DICESONICE.Load"),
                content: await renderTemplate("modules/dice-so-nice/templates/dialog-load.html",
                    {
                        saveList: saveList.keys()
                    }),
                buttons:{
                    load:{
                        icon: '<i class="fas fa-box-open"></i>',
                        label: game.i18n.localize("DICESONICE.Load"),
                        callback: async html => {
                            let name = $(html).find("[data-save-list]").val();
                            await this.actionLoadSave(name);
                            //Close Dice Settings
                            this.close();
                        }
                    },
                    no: {
                        icon: '<i class="fas fa-ban"></i>',
                        label: game.i18n.localize("DICESONICE.Cancel")
                    }
                },
                render: html => {
                    if(!saveList.size)
                        $(html).find('[data-button="load"]').prop("disabled",true);
                },
                default: "no"
            }, {
                width: 550
            }).render(true);
        });


        /**
         * Import
         */
        $(this.element).on("click", "[data-import]", async (ev) => {
            new Dialog({
                title: game.i18n.localize("DICESONICE.Import"),
                content: await renderTemplate("modules/dice-so-nice/templates/dialog-import.html"),
                buttons: {
                    import: {
                        icon: '<i class="fas fa-file-import"></i>',
                        label: game.i18n.localize("DICESONICE.Import"),
                        callback: html => {
                            const form = html.find("form")[0];
                            if (!form.data.files.length) return ui.notifications.error(game.i18n.localize("DICESONICE.ImportNoFile"));
                            readTextFromFile(form.data.files[0]).then(async json => {
                                await this.actionImportFromJSON(json);
                                this.close();
                            });
                        }
                    },
                    no: {
                        icon: '<i class="fas fa-ban"></i>',
                        label: "Cancel"
                    }
                },
                default: "import"
            }, {
                width: 400
            }).render(true);
        });

        $(this.element).on("click", "[data-export]", async (ev) => {
            const filename = `fvtt-dicesonice-${Date.now()}.json`;
            this.actionExportToJSON().then((json)=>{
                saveDataToFile(json, "text/json", filename);
            });
        });

        $(this.element).on("click", "#dice-configuration-canvas", (event) => {
            let rect = event.target.getBoundingClientRect();
            let x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            if (x > 1)
                x = 1;
            let y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;
            let pos = { x: x, y: y };
            let dice = this.box.findShowcaseDie(pos);
            if (dice) {
                let diceType = dice.object.userData;
                if (this.box.dicefactory.preferedSystem != "standard" && !game.user.getFlag("dice-so-nice", "appearance"))
                    this.getShowcaseAppearance();
                if ($(this.element).find(`.dsn-appearance-tabs [data-tab="${diceType}"]`).length) {
                    this.activateAppearanceTab(diceType);
                } else {
                    $(this.element).find(".dsn-appearance-hint").hide();
                    renderTemplate("modules/dice-so-nice/templates/partial-appearance.html", {
                        dicetype: diceType,
                        appearance: this.currentGlobalAppearance,
                        systemList: this.initializationData.systemList,
                        colorsetList: this.initializationData.colorsetList,
                        textureList: this.initializationData.textureList,
                        materialList: this.initializationData.materialList,
                        fontList: this.initializationData.fontList
                    }).then((html) => {
                        let tabName = diceType.toUpperCase();

                        let insertBefore = null;
                        //let's find where to insert the tab so it keeps the same order as the dice list
                        $(this.element).find(".dsn-appearance-tabs .item").each((index, el) => {
                            if (this.navOrder[$(el).data("tab")] >= this.navOrder[diceType]) {
                                insertBefore = $(el).data("tab");
                                return false;
                            }
                        });
                        let htmlNavString = `<span class="item" data-group="dsn-dice" data-tab="${diceType}">${tabName} <i class="fas fa-times" data-close-tab></i></span>`;
                        if (insertBefore) {
                            $(html).insertBefore($(this.element).find(`.tabAppearance[data-tab="${insertBefore}"]`));
                            $(htmlNavString).insertBefore($(this.element).find(`.dsn-appearance-tabs .item[data-tab="${insertBefore}"]`));
                        } else {
                            $(this.element).find("#dsn-appearance-content").append(html);
                            $(this.element).find(".dsn-appearance-tabs").append(htmlNavString);
                        }
                        this.activateAppearanceTab(diceType);
                        this.toggleCustomization(diceType);
                        this.filterSystems(diceType);
                    });
                }
            }
        });
    }

    async actionSaveAs(name){
        let savesObject = game.user.getFlag("dice-so-nice","saves");
        let saves;
        if(!savesObject){
            saves = new Map();
        } else {
            //temporary workaround for https://gitlab.com/foundrynet/foundryvtt/-/issues/5464
            saves = new Map(Object.entries(savesObject));
        }
        //save current settings first
        await this.submit({
            preventClose:true,
            preventRender:true
        });
        let saveObject = {
            appearance:game.user.getFlag("dice-so-nice","appearance"),
            sfxList:game.user.getFlag("dice-so-nice","sfxList"),
            settings:game.settings.get("dice-so-nice","settings")
        };

        saves.set(name,saveObject);
        game.user.unsetFlag("dice-so-nice","saves").then(()=>{
            game.user.setFlag("dice-so-nice","saves",Object.fromEntries(saves));
        });
    }

    async actionDeleteSave(name){
        let savesObject = game.user.getFlag("dice-so-nice","saves");
        let saves = new Map(Object.entries(savesObject));
        saves.delete(name);
        game.user.unsetFlag("dice-so-nice","saves").then(async ()=>{
            await game.user.setFlag("dice-so-nice","saves",Object.fromEntries(saves));
            ui.notifications.info(game.i18n.localize("DICESONICE.saveMessage"));
        });
    }

    async actionLoadSave(name){
        let savesObject = game.user.getFlag("dice-so-nice","saves");
        let save = new Map(Object.entries(savesObject)).get(name);

        if(save.appearance){
            await game.user.unsetFlag("dice-so-nice","appearance");
            await game.user.setFlag("dice-so-nice","appearance",save.appearance);
        }
        if(save.sfxList){
            await game.user.unsetFlag("dice-so-nice","sfxList");
            await game.user.setFlag("dice-so-nice","sfxList", save.sfxList);
        }
        await game.settings.set("dice-so-nice","settings",save.settings);
    }

    async actionExportToJSON(){
        
        //save current settings first
        await this.submit({
            preventClose:true,
            preventRender:true
        });
        let data = {
            appearance:game.user.getFlag("dice-so-nice","appearance"),
            sfxList:game.user.getFlag("dice-so-nice","sfxList"),
            settings:game.settings.get("dice-so-nice","settings")
        };

        return JSON.stringify(data, null, 2);
    }

    async actionImportFromJSON(json){
        let data = JSON.parse(json);

        if(data.appearance){
            await game.user.unsetFlag("dice-so-nice","appearance");
            await game.user.setFlag("dice-so-nice","appearance",data.appearance);
        }
        if(data.sfxList){
            await game.user.unsetFlag("dice-so-nice","sfxList");
            await game.user.setFlag("dice-so-nice","sfxList", data.sfxList);
        }
        if(data.settings){
            await game.settings.set("dice-so-nice","settings",data.settings);
        }
    }

    activateAppearanceTab(diceType) {
        let tabs = this._tabs[1];
        tabs.activate(diceType, { triggerCallback: true });
    }

    closeAppearanceTab(diceType) {
        if (diceType == "global")
            return;
        let tabs = this._tabs[1];
        if (this._tabs[1].active == diceType)
            tabs.activate("global", { triggerCallback: true });

        $(this.element).find(`.tabAppearance[data-tab="${diceType}"]`).remove();
        $(this.element).find(`.dsn-appearance-tabs [data-tab="${diceType}"]`).remove();

        this.onApply();
    }

    _onChangeTab(event, tabs, active) {
        super._onChangeTab(event, tabs, active);
        if (tabs._contentSelector == "#dsn-appearance-content") {
            if (this.lastActiveAppearanceTab != "global") {
                let appearanceArray = [];
                $(this.element).find(`.tabAppearance[data-tab="global"],.tabAppearance[data-tab="${this.lastActiveAppearanceTab}"]`).each((index, element) => {
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
                if (appearanceArray.length > 1) {
                    let diff = diffObject(appearanceArray[0], appearanceArray[1]);
                    if (isObjectEmpty(diff)) {
                        this.closeAppearanceTab(this.lastActiveAppearanceTab)
                    }
                }
            }
            this.lastActiveAppearanceTab = active;
        }
    }

    toggleHideAfterRoll() {
        let hideAfterRoll = $(this.element).find('[data-hideAfterRoll]')[0].checked;
        $(this.element).find('[data-timeBeforeHide]').prop("disabled", !hideAfterRoll);
        $(this.element).find('[data-hideFX]').prop("disabled", !hideAfterRoll);
    }

    toggleSounds() {
        let sounds = $(this.element).find('[data-sounds]')[0].checked;
        $(this.element).find('[data-soundsSurface]').prop("disabled", !sounds);
        $(this.element).find('[data-soundsVolume]').prop("disabled", !sounds);
        //$('.sounds-range-value').css({ 'opacity': !sounds ? 0.4 : 1 });
    }

    toggleAutoScale() {
        let autoscale = $(this.element).find('[data-autoscale]')[0].checked;
        $(this.element).find('[data-scale]').prop("disabled", autoscale);
        //$('.scale-range-value').css({ 'opacity': autoscale ? 0.4 : 1 });
    }

    toggleCustomColors(dicetype) {
        let scope = $(this.element).find(".tabAppearance");
        if (dicetype) {
            scope = scope.filter(`[data-tab="${dicetype}"]`);
        }
        scope.each((index, element) => {
            let colorset = $(element).find('[data-colorset]');
            let disabled = colorset.val() !== 'custom' || colorset.prop("disabled");
            $(element).find('[data-labelColor]').prop("disabled", disabled);
            $(element).find('[data-diceColor]').prop("disabled", disabled);
            $(element).find('[data-outlineColor]').prop("disabled", disabled);
            $(element).find('[data-edgeColor]').prop("disabled", disabled);
            $(element).find('[data-labelColorSelector]').prop("disabled", disabled);
            $(element).find('[data-diceColorSelector]').prop("disabled", disabled);
            $(element).find('[data-outlineColorSelector]').prop("disabled", disabled);
            $(element).find('[data-edgeColorSelector]').prop("disabled", disabled);
        });
    }

    toggleCustomization(diceType = null) {
        let container;
        if (diceType) {
            container = $(this.element).find(`.tabAppearance[data-tab="${diceType}"]`);
        } else {
            container = $(this.element).find(`.tabAppearance`);
        }

        container.each((index, element) => {
            let diceType = $(element).data("tab");
            if (diceType != "global") {
                let system = $(element).find('[data-system]').val();
                let customizationElements = $(element).find('[data-colorset],[data-texture],[data-material],[data-font]');
                if (system != "standard") {
                    let diceobj = this.box.dicefactory.systems[system].dice.find(obj => obj.type == diceType);
                    customizationElements.prop("disabled", (diceobj && (diceobj.modelFile || diceobj.colorset)));
                } else {
                    customizationElements.prop("disabled", false);
                }
            }
        });
        this.toggleCustomColors(diceType);
    }

    filterSystems(diceType = null) {
        let container;
        if (diceType) {
            container = $(this.element).find(`.tabAppearance[data-tab="${diceType}"] [data-system]`);
        } else {
            container = $(this.element).find(`.tabAppearance [data-system]`);
        }
        container.each((index, element) => {
            let diceType = $(element).data("dicetype");
            if (diceType != "global") {
                $(element).find("option").each((indexOpt, elementOpt) => {
                    if (!this.box.dicefactory.systems[$(elementOpt).val()].dice.find(obj => obj.type == diceType))
                        $(elementOpt).attr("disabled", "disabled");
                });
            }
        });
    }

    setPreferedSystem() {
        if (this.box.dicefactory.preferedSystem != "standard" && !game.user.getFlag("dice-so-nice", "appearance")) {
            $(this.element).find('.tabAppearance[data-tab="global"] [data-system]').val(this.box.dicefactory.preferedSystem);
        }
    }

    getShowcaseAppearance() {
        let config = {
            autoscale: false,
            scale: 60,
            shadowQuality: $('[data-shadowQuality]').val(),
            bumpMapping: $('[data-bumpMapping]').is(':checked'),
            sounds: $('[data-sounds]').is(':checked'),
            throwingForce: $('[data-throwingForce]').val(),
            useHighDPI: $('[data-useHighDPI]').is(':checked'),
            appearance: {}
        };
        $(this.element).find('.tabAppearance').each((index, element) => {
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
        return config;
    }

    //Not used because SFX aren't initialized. Keeping it here for later use.
    getShowcaseSFX() {
        let sfxList = [];

        $(this.element).find('.sfx-line').each((index, element) => {
            let sfx = {
                diceType: $(element).find('[data-sfx-dicetype]').val(),
                onResult:$(element).find('[data-sfx-result]').val(),
                specialEffect:$(element).find('[data-sfx-specialeffect]').val()
            };
            if(sfx.diceType && sfx.onResult && sfx.specialEffect)
                sfxList.push(sfx);
        });
        return sfxList;
    }

    onApply(event = null) {
        if (event)
            event.preventDefault();

        setTimeout(() => {
            let config = this.getShowcaseAppearance();
            this.box.dicefactory.disposeCachedMaterials("showcase");
            this.box.update(config).then(() => {
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
        if (sfxLine) {
            sfxLine = Object.values(sfxLine);
            //Remove empty lines
            for (let i = sfxLine.length - 1; i >= 0; i--) {
                if (sfxLine[i].diceType == "" || sfxLine[i].onResult == "")
                    sfxLine.splice(i, 1);
            }
            //Remove duplicate lines
            let dataArr = sfxLine.map(item => {
                return [JSON.stringify(item), item]
            });
            let mapArr = new Map(dataArr);

            sfxLine = [...mapArr.values()];

            delete formData.sfxLine;
        }

        for (let scope in formData.appearance) {
            if (formData.appearance.hasOwnProperty(scope)) {
                if (formData.appearance[scope].colorset != "custom") {
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

        game.socket.emit("module.dice-so-nice", { type: "update", user: game.user.id });
        DiceSFXManager.init();
        ui.notifications.info(game.i18n.localize("DICESONICE.saveMessage"));
    }

    close(options) {
        super.close(options);
        this.box.clearScene();
        this.box.dicefactory.disposeCachedMaterials("showcase");
    }
}