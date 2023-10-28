/**
 * This class contains utility functions for working with shaders.
 * These functions are called during the onBeforeCompile event.
 * @class ShaderUtils
 */
export class ShaderUtils {

	static applyDiceSoNiceShader(shader) {

		if(this.emissive !== undefined && game.dice3d.DiceFactory.realisticLighting) {
			ShaderUtils.selectiveBloomShaderFragment(shader);
		}

		// This is the old iridescent shader, which is now deprecated.
		if (this.userData.iridescent) {
			ShaderUtils.iridescentShaderFragment(shader);
		}

		if (shader.shaderName == "MeshPhysicalMaterial" && shader.transmission) {
			ShaderUtils.transmissionAlphaShaderFragment(shader);
		}

		if (shader.shaderName == "MeshPhysicalMaterial" && shader.iridescence) {
			ShaderUtils.iridescenceShaderFragment(shader);
		}
	}

	static transmissionAlphaShaderFragment(shader) {
		shader.fragmentShader = shader.fragmentShader.replace(`#include <transmission_fragment>`,
			`#include <transmission_fragment>
			totalDiffuse = mix( totalDiffuse, transmission.rgb, transmissionFactor);
			float grey = (material.diffuseColor.r + material.diffuseColor.g + material.diffuseColor.b) / 3.0;
			transmissionAlpha = mix( transmissionAlpha, 1.0-grey, transmissionFactor );`);
	}

	static selectiveBloomShaderFragment(shader) {
		shader.uniforms.globalBloom = game.dice3d.uniforms.globalBloom;
		shader.fragmentShader = `
			uniform float globalBloom;
			${shader.fragmentShader}
		`.replace(
			`#include <dithering_fragment>`,
			`#include <dithering_fragment>
			if (globalBloom > 0.5) {
				#ifdef USE_EMISSIVEMAP
					gl_FragColor.rgb = texture2D( emissiveMap, vMapUv ).rgb * emissive;
				#else
					gl_FragColor.rgb = vec3(0.0);
				#endif
			}
		`
		);
	}

	static iridescenceShaderFragment(shader) {
		// We only need to change the color channel used by the ThreeJS shader for the iridescenceMap from red to blue.
		// This is because we want to use the metallic channel for the iridescenceMap.
		shader.fragmentShader = shader.fragmentShader.replace(`#include <lights_physical_fragment>`,
			`#include <lights_physical_fragment>
				#ifdef USE_IRIDESCENCE
					material.iridescence = iridescence;
					#ifdef USE_IRIDESCENCEMAP
						material.iridescence *= texture2D( iridescenceMap, vUv ).b;
					#endif
				#endif`);
	}
	// This is the old iridescent shader, which is now deprecated.
	static iridescentShaderFragment(shader) {
		shader.uniforms.iridescenceLookUp = game.dice3d.uniforms.iridescenceLookUp;
		shader.uniforms.iridescenceNoise = game.dice3d.uniforms.iridescenceNoise;
		shader.uniforms.boost = game.dice3d.uniforms.boost;

		shader.vertexShader = `
			varying vec3 viWorldPosition;
			varying vec3 viWorldNormal;
			${shader.vertexShader}
		`.replace(
			`#include <fog_vertex>`,
			`#include <fog_vertex>
			viWorldPosition = worldPosition.xyz;
			viWorldNormal = mat3(modelMatrix) * normalize(normal);
			`
		);

		shader.fragmentShader = `
			varying vec3 viWorldPosition;
			varying vec3 viWorldNormal;
			
			uniform sampler2D iridescenceLookUp;
			uniform sampler2D iridescenceNoise;
			uniform float boost;
			${shader.fragmentShader}
		`.replace(
			`#include <transmission_fragment>`,
			`vec3 viewWorldDir = normalize(viWorldPosition - cameraPosition);
			vec3 iNormal = normalize(viWorldNormal); 
			float NdotV = max(-dot(viewWorldDir, iNormal), 0.0);
			float fresnelFactor = pow(1.0 - NdotV, 5.0);
			float noise = texture2D(iridescenceNoise, vUv/2.0).r;
			vec3 airy = texture2D(iridescenceLookUp, vec2(NdotV * .99, noise)).xyz;
			
			if(metalnessFactor >= 1.0) {
				totalSpecular = totalSpecular  * airy * boost;
			}

			#include <transmission_fragment>`
		);
	}
}