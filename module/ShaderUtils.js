export class ShaderUtils {
    // Use the emissive map for the bloom pass

	static selectiveBloomShaderFragment(shader){
		shader.uniforms.globalBloom = game.dice3d.uniforms.globalBloom;
		shader.fragmentShader = `
			uniform float globalBloom;
			${shader.fragmentShader}
		`.replace(
			`#include <dithering_fragment>`,
			`#include <dithering_fragment>
			if (globalBloom > 0.5) {
				#ifdef USE_EMISSIVEMAP
					gl_FragColor.rgb = texture2D( emissiveMap, vUv ).rgb * emissive;
				#else
					gl_FragColor.rgb = vec3(0.0);
				#endif
			}
		`
		);
	}
}