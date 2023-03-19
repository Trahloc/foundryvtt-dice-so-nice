import sourcemaps from "rollup-plugin-sourcemaps";
import { terser } from "rollup-plugin-terser";
import copy from "rollup-plugin-copy";
import { nodeResolve } from '@rollup/plugin-node-resolve';
import del from 'rollup-plugin-delete';
import webWorkerLoader from 'rollup-plugin-web-worker-loader';
import commonjs from '@rollup/plugin-commonjs';

const staticFiles = [
  { name: "css" },
  { name: "fonts" },
  { name: "images" },
  { name: "lang" },
  { name: "select2.min.js", folder: "libs" },
  { name: "models", folder: "sfx" },
  { name: "sounds", folder: "sfx" },
  { name: "textures", folder: "sfx" },
  { name: "sounds" },
  { name: "templates" },
  { name: "textures" },
  { name: "module.json" },
];

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
  input: {
    "main": "module/main.js"
  },
  output: {
    dir: "dist",
    format: "es",
    sourcemap: true
  },
  onwarn(warning, rollupWarn) {
    if (warning.code !== 'CIRCULAR_DEPENDENCY') {
      rollupWarn(warning);
    }
  },
  plugins: [
    commonjs({
      include: "node_modules/webworker-promise/**",
      extensions: ['.js']
    }),
    del({
      targets: 'dist/*',
      runOnce: true
    }),
    nodeResolve({ preferBuiltins: false }),
    sourcemaps(),
    process.env.NODE_ENV === "production" && terser({ ecma: 2020, keep_fnames: true }),
    copy({
      targets: staticFiles.map((file) => ({
        src: `module/${file.folder ? `${file.folder}/` : ""}${file.name}`,
        dest: `dist${file.folder ? `/${file.folder}` : ""}`,
      })),
    }),
    webWorkerLoader({
      targetPlatform: 'browser',
      preserveSource: true
    })
  ]
};

module.exports = config;
