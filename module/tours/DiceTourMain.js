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
                    title: "Settings tab",
                    content: "Go to your Settings tab",
                    action: "click"
                },
                {
                    id: "goto-configure",
                    selector: "[data-action=\"configure\"]",
                    title: "Configure Settings",
                    content: "Click on the Configure Settings button",
                    action: "click"
                },
                {
                    id: "goto-modulessettings",
                    title: "Modules settings",
                    selector: "[data-tab=\"modules\"]",
                    content: "Navigate to the Modules settings tab",
                    action: "click"
                },
                {
                    id: "goto-dicesonice",
                    title: "Dice So Nice settings",
                    selector: "[data-tab=\"modules\"] h2.dice-tour",
                    content: "This is where the GM and users can configure settings for Dice So Nice! Anything outside of the 3D Dice Settings is affecting all players.",
                    action: "scrollTo"
                },
                {
                    id: "goto-dicesonice-settings",
                    title: "3D Dice Settings",
                    selector: "[data-key=\"dice-so-nice.dice-so-nice\"]",
                    content: "Open your personnal 3D dice settings to customize your dice.",
                    action: "click"
                },
                {
                    id: "show-3d-dice",
                    title: "Where the magic happens",
                    selector: "#dice-configuration-canvas",
                    content: "This is the 3D dice preview. You can see your own dice here. Each player has their own dice. You can also click on a dice to customize it."
                },
                {
                    id: "show-appearance",
                    title: "Appearance",
                    selector: "#dsn-appearance-content",
                    content: "Below the preview, you can change your dice appearance. Browse the available themes or create your own.",
                    action: "click",
                    target: ".dice-so-nice a[data-tab=\"preferences\"]"
                },
                {
                    id:"show-preferences",
                    title: "Preferences",
                    selector: ".dice-so-nice div.tab.active[data-tab=\"preferences\"]",
                    content: "Change your preferences to your liking. Sounds, animation speed, dice scale and more.",
                    action: "click",
                    target: ".dice-so-nice a[data-tab=\"sfx\"]"
                },
                {
                    id: "show-sfx",
                    title: "Special effects",
                    selector: ".dice-so-nice div.tab.active[data-tab=\"sfx\"]",
                    content: "You can add special effects to your rolls. For example, you can add a sound effect when you roll a 20!",
                    action: "click",
                    target: ".dice-so-nice a[data-tab=\"performance\"]"
                },
                {
                    id: "show-performance",
                    title: "Performance",
                    selector: ".dice-so-nice div.tab.active[data-tab=\"performance\"]",
                    content: "If your computer is a bit slow, you can tweak these settings to improve the performance of the 3D animation.",
                    action: "click",
                    target: ".dice-so-nice a[data-tab=\"backup\"]"
                },
                {
                    id: "show-backup",
                    title: "Backup & Restore",
                    selector: ".dice-so-nice div.tab.active[data-tab=\"backup\"]",
                    content: "You can save your settings in multiple save files. This is useful if you wish to switch quickly between multiple custom appearance you created.",
                },
                {
                    id: "end-tour",
                    title: "End of the tour",
                    selector: ".dice-so-nice div.tab.active[data-tab=\"backup\"]",
                    content: "If you want more info, check our help page in your Module Management window. Happy rolling!"
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