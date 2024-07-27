// Import necessary plugins
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { del } from '@kineticcafe/rollup-plugin-delete';
import copy from 'rollup-plugin-copy';
import webWorkerLoader from 'rollup-plugin-web-worker-loader';

// Define static files for the copy plugin
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

// Environment flag to detect watch mode
const isProduction = process.env.NODE_ENV === "production";
const isWatch = process.env.ROLLUP_WATCH;

// Rollup configuration
const config = {
  input: {
    main: 'module/main.js',
    api: 'module/api.js'
  },
  output: {
    dir: 'dist',
    format: 'es',
    entryFileNames: '[name].js',
    chunkFileNames: '[name]-[hash].js',
    sourcemap: !isProduction,
    manualChunks(id) {
      if (id.includes('api.js')) {
        return 'api';
      }
    }
  },
  plugins: [
    !isWatch && del({
      targets: 'dist/*',
      runOnce: true
    }),
    !isWatch && copy({
      targets: staticFiles.map((file) => ({
        src: `module/${file.folder ? `${file.folder}/` : ""}${file.name}`,
        dest: `dist${file.folder ? `/${file.folder}` : ""}`,
      })),
    }),
    nodeResolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs({
      include: /node_modules/
    }),
    isProduction && terser({
      ecma: 2020,
      keep_fnames: true,
      compress: {
        drop_console: true
      }
    }),
    webWorkerLoader({
      targetPlatform: 'browser',
      preserveSource: true
    })
  ].filter(Boolean),
  onwarn(warning, warn) {
    if (warning.code !== 'CIRCULAR_DEPENDENCY') {
      warn(warning);
    }
  }
};

export default config;