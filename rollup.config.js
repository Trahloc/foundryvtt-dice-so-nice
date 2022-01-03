import sourcemaps from "rollup-plugin-sourcemaps";
import { terser } from "rollup-plugin-terser";
import copy from "rollup-plugin-copy";

const staticFiles = [
  { name: "css" },
  { name: "fonts" },
  { name: "images" },
  { name: "lang" },
  { name: "cannon.min.js", folder: "libs" },
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
  input: "module/main.js",
  output: {
    dir: "dist",
    format: "es",
    sourcemap: true,
    preserveModules: true, // remove this to bundle into a single file, cannon.min.js and select2.min.js will still be copied over as-is
  },
  plugins: [
    sourcemaps(),
    process.env.NODE_ENV === "production" && terser({ ecma: 2020, keep_fnames: true }),
    copy({
      targets: staticFiles.map((file) => ({
        src: `module/${file.folder ? `${file.folder}/` : ""}${file.name}`,
        dest: `dist${file.folder ? `/${file.folder}` : ""}`,
      })),
    }),
  ],
};

module.exports = config;
