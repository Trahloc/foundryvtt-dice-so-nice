import { DiceTour } from "./DiceTour.js";

export class DiceTourMain extends DiceTour {
    constructor() {
        super({
            title: "How to use Dice So Nice!",
            description: "Learn how to customize your 3D dice in this short tour of the module",
            canBeResumed: false,
            display: true,
            steps: [
                {
                    id: "goto-settings",
                    selector: "[data-tab=\"settings\"]",
                    title: game.i18n.localize("DICESONICE.TourMainTitleGotoSettings"),
                    content: game.i18n.localize("DICESONICE.TourMainContentGotoSettings"),
                    action: "click"
                },
                {
                    id: "goto-configure",
                    selector: "[data-action=\"configure\"]",
                    title: game.i18n.localize("DICESONICE.TourMainTitleGotoConfigure"),
                    content: game.i18n.localize("DICESONICE.TourMainContentGotoConfigure"),
                    action: "click"
                },
                {
                    id: "goto-modulessettings",
                    title: game.i18n.localize("DICESONICE.TourMainTitleGotoModulesSettings"),
                    selector: "[data-tab=\"modules\"]",
                    content: game.i18n.localize("DICESONICE.TourMainContentGotoModulesSettings"),
                    action: "click"
                },
                {
                    id: "goto-dicesonice",
                    title: game.i18n.localize("DICESONICE.TourMainTitleGotoDiceSoNice"),
                    selector: "[data-tab=\"modules\"] h2.dice-tour",
                    content: game.i18n.localize("DICESONICE.TourMainContentGotoDiceSoNice"),
                    action: "scrollTo"
                },
                {
                    id: "goto-dicesonice-settings",
                    title: game.i18n.localize("DICESONICE.TourMainTitleGotoDiceSoNiceSettings"),
                    selector: "[data-key=\"dice-so-nice.dice-so-nice\"]",
                    content: game.i18n.localize("DICESONICE.TourMainContentGotoDiceSoNiceSettings"),
                    action: "click"
                },
                {
                    id: "show-3d-dice",
                    title: game.i18n.localize("DICESONICE.TourMainTitleShow3DDice"),
                    selector: "#dice-configuration-canvas",
                    content: game.i18n.localize("DICESONICE.TourMainContentShow3DDice")
                },
                {
                    id: "show-appearance",
                    title: game.i18n.localize("DICESONICE.TourMainTitleShowAppearance"),
                    selector: "#dsn-appearance-content",
                    content: game.i18n.localize("DICESONICE.TourMainContentShowAppearance"),
                    action: "click",
                    target: ".dice-so-nice a[data-tab=\"preferences\"]"
                },
                {
                    id:"show-preferences",
                    title: game.i18n.localize("DICESONICE.TourMainTitleShowPreferences"),
                    selector: ".dice-so-nice div.tab.active[data-tab=\"preferences\"]",
                    content: game.i18n.localize("DICESONICE.TourMainContentShowPreferences"),
                    action: "click",
                    target: ".dice-so-nice a[data-tab=\"sfx\"]"
                },
                {
                    id: "show-sfx",
                    title: game.i18n.localize("DICESONICE.TourMainTitleShowSFX"),
                    selector: ".dice-so-nice div.tab.active[data-tab=\"sfx\"]",
                    content: game.i18n.localize("DICESONICE.TourMainContentShowSFX"),
                    action: "click",
                    target: ".dice-so-nice a[data-tab=\"performance\"]"
                },
                {
                    id: "show-performance",
                    title: game.i18n.localize("DICESONICE.TourMainTitleShowPerformance"),
                    selector: ".dice-so-nice div.tab.active[data-tab=\"performance\"]",
                    content: game.i18n.localize("DICESONICE.TourMainContentShowPerformance"),
                    action: "click",
                    target: ".dice-so-nice a[data-tab=\"backup\"]"
                },
                {
                    id: "show-backup",
                    title: game.i18n.localize("DICESONICE.TourMainTitleShowBackup"),
                    selector: ".dice-so-nice div.tab.active[data-tab=\"backup\"]",
                    content: game.i18n.localize("DICESONICE.TourMainContentShowBackup")
                },
                {
                    id: "end-tour",
                    title: game.i18n.localize("DICESONICE.TourMainTitleEndTour"),
                    selector: ".dice-so-nice div.tab.active[data-tab=\"backup\"]",
                    content: game.i18n.localize("DICESONICE.TourMainContentEndTour")
                }
            ]
        });
    }
    /**
     * Override the DiceTour _preStep method to wait for the element to exists in the DOM
     */
    async _preStep() {
        switch (this.currentStep.id) {
            case "goto-settings":
                //start on the chat tab
                document.querySelector('a[data-tab="chat"]').click();
                break;
            case "goto-dicesonice":
                //There is no native selector available for this step so we add something to identify the element with jQuery
                $("[data-tab=\"modules\"] h2:contains('Dice So Nice!')").addClass("dice-tour");
                break;
        }

        await super._preStep();
    }

    async _postStep() {
        if(!this.currentStep)
            return;
        switch (this.currentStep.id) {
            case "end-tour":
                //end the tour with a bang
                document.querySelector('.dice-so-nice button[data-test]').click();
            break;
        }
        await super._postStep();
    }
}