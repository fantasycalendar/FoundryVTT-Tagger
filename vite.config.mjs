import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import autoprefixer from "autoprefixer";
import postcssPresetEnv from "postcss-preset-env";
import { defineConfig } from "vite";
import moduleJSON from "./module.json";

const modulePath = `modules/${moduleJSON.id}`;
const port = 30000; // Port where Foundry is running.
const devPort = 30001; // Port where this vite server runs.
const entry = "module.js"; // Entry file inside src/.

const postcss = {
	inject: false,
	sourceMap: true,
	extensions: [".css"],
	plugins: [autoprefixer, postcssPresetEnv],
};

export default defineConfig(() => {
	return {
		root: "src/",
		base: `/${modulePath}/dist`,
		publicDir: false,
		cacheDir: "../.vite-cache",

		resolve: {
			conditions: ["browser", "import"],
			alias: {
				moduleJSON: path.resolve(__dirname, "./module.json"),
			},
		},

		esbuild: {
			target: ["es2023"],
		},

		css: { postcss },

		server: {
			open: "/join",
			port: devPort,
			proxy: {
				// Static module assets served by main Foundry server.
				[`^(/${modulePath}/(docs))`]: `http://localhost:${port}`,

				// All other paths besides this package's path are served by Foundry.
				[`^(?!/${modulePath}/)`]: `http://localhost:${port}`,

				// Rewrite Foundry's request for the built bundle to the dev server entry.
				[`/${modulePath}/dist/${moduleJSON.id}.js`]: {
					target: `http://localhost:${devPort}/${modulePath}/dist`,
					rewrite: () => `/${entry}`,
				},

				// Foundry socket.io passthrough.
				"/socket.io": { target: `ws://localhost:${port}`, ws: true },
			},
		},

		build: {
			outDir: "../dist",
			emptyOutDir: true,
			sourcemap: true,
			minify: "terser",
			target: ["es2023"],
			terserOptions: {
				compress: {
					passes: 3,
				},
				mangle: {
					toplevel: true,
					keep_classnames: true,
					keep_fnames: true,
				},
				module: true,
				ecma: 2020,
			},
			lib: {
				entry,
				formats: ["es"],
				fileName: moduleJSON.id,
			},
			rollupOptions: {
				output: {
					// Rewrite the default style.css to match module.json's reference.
					assetFileNames: assetInfo =>
						assetInfo.name === "style.css" ? `${moduleJSON.id}.css` : assetInfo.name,
				},
			},
		},

		optimizeDeps: {
			esbuildOptions: {
				target: "es2023",
			},
		},

		plugins: [
			{
				// During `vite serve`, Foundry expects the files declared in module.json
				// to exist on disk; create empty placeholders so it can boot.
				name: "create-dist-files",
				apply: "serve",
				buildStart() {
					if (!existsSync("dist")) mkdirSync("dist", { recursive: true });
					const files = [...moduleJSON.esmodules, ...moduleJSON.styles];
					for (const name of files) {
						const target = name.replace(/^\.?\//, "");
						writeFileSync(target, "", { flag: "a" });
					}
				},
			},
		],
	};
});
