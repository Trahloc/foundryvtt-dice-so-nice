import { Clock, Color } from 'three';
import { DiceSFX } from '../DiceSFX.js';
import { ShaderUtils } from './../ShaderUtils';

export class PlayAnimationDark extends DiceSFX {
    static id = "PlayAnimationDark";
    static specialEffectName = "DICESONICE.PlayAnimationDark";
    static darkColor = null;
    static duration = 1.5;
    static sound = "modules/dice-so-nice/sfx/sounds/darkness.mp3";
    /**@override init */
    static async init() {
        PlayAnimationDark.darkColor = new Color(0.1,0.1,0.1);
        game.audio.pending.push(function(){
            foundry.audio.AudioHelper.preloadSound(PlayAnimationDark.sound);
        }.bind(this));
    }

    /**@override play */
    async play() {
        if(!this.dicemesh.material && this.dicemesh.userData.glow){
            //We check if there's a glow target specified
            this.dicemesh.traverse(object => {
                if (object.userData && object.userData.name && object.userData.name === this.dicemesh.userData.glow) this.glowingMesh=object;
            });
        } else if(this.dicemesh.material){
            this.glowingMesh=this.dicemesh;
        } else {
            return false;
        }
        this.clock = new Clock();
        this.baseColor = this.glowingMesh.material.color.clone();
        this.baseMaterial = this.glowingMesh.material;
        let userData = this.baseMaterial.userData;
        this.baseMaterial.userData = {};
        this.glowingMesh.material = this.baseMaterial.clone();
        this.glowingMesh.userData = userData;
        this.glowingMesh.material.onBeforeCompile = ShaderUtils.applyDiceSoNiceShader;
        foundry.audio.AudioHelper.play({
			src: PlayAnimationDark.sound,
            volume: this.volume
		}, false);
        this.renderReady = true;
    }

    render() {
        if(!this.renderReady)
            return;
        let x = 1-((PlayAnimationDark.duration - this.clock.getElapsedTime())/PlayAnimationDark.duration);
        if(x>1){
            this.destroy();
        } else {
            let val = 0.05172144 + 9.269017*x - 26.55545*x**2 + 26.19969*x**3 - 8.977907*x**4;
            val = Math.min(Math.max(val, 0), 1);
            this.glowingMesh.material.color.copy(this.baseColor);
            this.glowingMesh.material.color.lerp(PlayAnimationDark.darkColor, val);
        }
    }

    destroy(){
        let sfxMaterial = this.glowingMesh.material;
        this.glowingMesh.material = this.baseMaterial;
        sfxMaterial.dispose();
        this.destroyed = true;
    }
}