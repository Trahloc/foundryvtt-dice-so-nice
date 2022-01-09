import { DiceSFX } from '../DiceSFX.js';
import * as THREE from 'three';

export class PlayAnimationBright extends DiceSFX {
    static id = "PlayAnimationBright";
    static specialEffectName = "DICESONICE.PlayAnimationBright";
    static brightColor = null;
    static duration = 0.6;
    static sound = "modules/dice-so-nice/sfx/sounds/bright.mp3";
    /**@override init */
    static async init() {
        PlayAnimationBright.brightColor = new THREE.Color(0.3,0.3,0.3);
        this.glowingMesh=null;
        game.audio.pending.push(function(){
            AudioHelper.preloadSound(PlayAnimationBright.sound);
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
        if(!this.glowingMesh.material.emissiveMap)
            return false;
        this.clock = new THREE.Clock();
        this.baseColor = this.glowingMesh.material.emissive.clone();
        AudioHelper.play({
            src: PlayAnimationBright.sound,
            volume: this.volume
		}, false);
        this.renderReady = true;
    }

    render() {
        if(!this.renderReady)
            return;
        let x = 1-((PlayAnimationBright.duration - this.clock.getElapsedTime())/PlayAnimationBright.duration);
        if(x>1){
            this.destroy();
        } else {
            let val = (Math.sin(2 * Math.PI * (x - 1/4)) + 1) / 2;
            this.glowingMesh.material.emissive.copy(this.baseColor);
            this.glowingMesh.material.emissive.lerp(PlayAnimationBright.brightColor, val);
        }
    }

    destroy(){
        this.destroyed = true;
    }
}