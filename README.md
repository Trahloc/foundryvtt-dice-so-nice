# Foundry VTT - Dice So Nice!
[![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fdice-so-nice&colorB=4aa94a)](https://forge-vtt.com/bazaar#package=dice-so-nice)
[![Foundry Hub Endorsements](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Fdice-so-nice%2Fshield%2Fendorsements)](https://www.foundryvtt-hub.com/package/dice-so-nice/)
[![Foundry Hub Comments](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Fdice-so-nice%2Fshield%2Fcomments)](https://www.foundryvtt-hub.com/package/dice-so-nice/)

This module for Foundry VTT adds the ability to show a 3D dice simulation when a roll is made.

[[_TOC_]]

# Installation

To install, follow these instructions:

1.  Inside Foundry, select the Game Modules tab in the Configuration and Setup menu.
2.  Click the Install Module button and enter the following URL: https://gitlab.com/riccisi/foundryvtt-dice-so-nice/raw/master/module/module.json
3.  Click Install and wait for installation to complete.

Alternatively, use the integrated module manager in Foundry.

# Usage Instructions

There are no particular instructions for use. Once the module is enabled, 3D animation will be displayed each time dice is rolled on foundry.

![Preview](./dice-so-nice.gif?raw=true)

# Configuration
There's two type of settings:
- The GM settings can only be modified by a GM user and will affect everyone in this FVTT world.
- The Player's dice settings are linked to a player in a single world and can be modified by himself. These settings won't affect other players settings.
## Appearance
![Preview](./settings-appearance.jpg?raw=true)
- **Enable 3D dices**: Enable the 3D dice display in this browser session.
- **Dice Presets (Faces)**: Allows to select the dices faces. Default is "Standard" where every face is a text label. Some game systems can force this value for all players to display their own dices.
- **Theme**: Allows to select a color theme for your dices. Themes changes every color settings and can pack multiple colors that will be selected at random each time you roll. A theme can also include a default texture that will be displayed if you selected "None / Auto (Theme)" in the "Texture" dropdown.
- **Texture**: Allows to select a texture for the dice. Selecting "None / Auto (Theme)" will show the theme texture if there is one.
- **Material**: Allows to select a material for the dice. Selecting "Auto (Theme)" will show the theme material if there is one. Default is "plastic".
- **Font**: Allows to select a font for the dice. Selecting "Auto (Theme)" will use the theme font instead.
- **Label Color**: Allows to change the color of the dice label. 
- **Dice Color**: Allows to change the color of the dice.
- **Outline Color**: Allows to change the color of the dice label outline.
- **Edge Color**: Allows to change the color of the edges of the dice.  

**Note:** You can click on any dice to customize it instead of using a global settings for all the dice.

## Preferences
![Preview](./settings-preferences.jpg?raw=true)
- **Automatically Hide**: When enabled, the dice disappear automatically after the result is displayed.
- **Millisecs Before Hiding**: time in milliseconds after which the dice disappear automatically.
- **Hide FX**: Effect used during dice hiding
- **Sound Effects**: When enabled, custom sounds with "realistic" collision effects are played when the dices roll.
- **Sound Volume**: Let you change the dice sound effect volume. This setting is applied on top of the "Interface" volume bar.
- **Table surface for sounds**: Allows to select the type of sound made by dice hitting the virtual table.
- **Auto Scale**: When enabled, auto scale the dice dimension based on the display size.
- **Manual Scale**: Allows to manually change the scale of the dice.
- **Animation Speed**: Change the speed at which the dices roll.
- **3D layer position**: Select if dice appear on top of the UI or under.
- **Throwing force**: Change the magnitude of the vector applied to roll the dice. Let you either gently roll the dice or throw them with full force like a mad man.

## Special Effects
![Preview](./settings-sfx.jpg?raw=true)
- **Show other players special effects**: When enabled, it will play the special effects from other players settings. Disable to only show your own.
- **Settings**: Some special effects require further options to work properly. Click on the Gear icon to access these options. 
- **Add**: You can add special effects. A special effect is a short animation and/or sound played when a die roll on a specified result. Ex: Rolling a native 20 on a d20.  

💥[You can find a gallery of all special effects here](https://gitlab.com/riccisi/foundryvtt-dice-so-nice/-/wikis/Special-Effects)💥

## Performance
![Preview](./settings-performance.jpg?raw=true)
- **Shadows Quality**: Allows to select the shadows quality. Can help with performances on some PCs.
- **Advanced lighting**: When enabled, use realistic lighting (HDRI). Disable for better performances.
- **Enable 'high density' screen support**: When enabled, it will upscale the 3D view to benefit from the extra pixels. Only have an effect on HDPI screens (like Retina display, 4k, etc). High-end GPU needed.

## Backup & Restore
![Preview](./settings-backuprestore.jpg?raw=true)
- **Save As**: Manage your save files. You can have an unlimited number of save files to rapidly switch between multiple settings.
- **Load**: Load a previously created save file.
- **Import**: Import a Dice So Nice setting file from a local file.
- **Export all**: Export all settings (appearances, preferences, sfx, performance settings) to a JSON file.
- **Export Special effects**: Export only the Special effects list to a JSON file.
- **Reset to Default**: Reset all settings to their default value.

# Documentation and API
A complete API and documentation for developers and artists alike is available in the [Wiki](https://gitlab.com/riccisi/foundryvtt-dice-so-nice/-/wikis/home)

# Known limitations

- Works with vanilla foundry and with modules that do not substantially modify the Roll API.

# Compatibility

Tested on Foundry VTT 0.8.8  
If you need to use an older Foundry version, please [download a compatible older version](https://foundryvtt.com/packages/dice-so-nice/)

# Acknowledgment

Based on the "Online 3D dice roller" from [http://a.teall.info/dice](http://www.teall.info/2014/01/online-3d-dice-roller.html). 
Credits go to Anton Natarov, who published it under public domain.

> "You can assume that it has the MIT license (or that else) if you wish so. I do not love any licenses at all and prefer to simply say that it is completely free =)" - Anton Natarov

v2 of "Dice So Nice" based on Teal's fork from the awesome MajorVictory, with his direct consent. You can find his online roller here: http://dnd.majorsplace.com/dice/

d10 Geometry created by Greewi who did all the maths for our custom "Pentagonal Trapezohedron". You can find his homebrewed (french) TTRPG Feerie/Solaires here: https://feerie.net

Built on [ThreeJS](https://threejs.org/), [CannonJS](https://schteppe.github.io/cannon.js/) and [Proton](https://github.com/drawcall/three.proton)

## Theme and model credits:
- **Spencer Thayer:** `Thylean Bronze` theme
- **Foundry VTT:** For the FVTT Logo in the `Foundry VTT` preset.
- **LyncsCwtsh:** For the `Spectrum` system (Discord: LyncsCwtsh#7116).
- **MajorVictory:** For all the other theme in this module!
- **[Joost Vanhoutte](https://joost3d.com/hdris/):** For the "Foyer" HDRI map
- Additional sound effects from https://www.zapsplat.com

Many thanks to the people who continue to support us on Discord, to the amazing system and module developers who integrate our module and to the artists who have let us integrate their textures in Dice So Nice!

# Feedback

Every suggestions/feedback are appreciated, if so, please contact (Simone#6710) or JDW (JDW#6422) on discord 

To report a bug, please open a new issue [in our tracker](https://gitlab.com/riccisi/foundryvtt-dice-so-nice/-/issues) or use the [Bug Reporter module](https://www.foundryvtt-hub.com/package/bug-reporter/)

# License

FoundryVTT Dice So Nice is a module for Foundry VTT by Simone and JDW and is licensed under a [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/).

This work is licensed under Foundry Virtual Tabletop [EULA - Limited License Agreement for module development](https://foundryvtt.com/article/license/).