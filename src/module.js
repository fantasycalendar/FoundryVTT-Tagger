import "./styles/module.scss";

import { registerHotkeys } from "./hotkeys.js";
import { registerSidebarTabIntegration } from "./sidebar-tab.js";
import Tagger from "./tagger.js";
import TaggerHandler from "./tagger-handler.js";
import { TaggerConfig, TABBED_ANCHORS, TAGGABLE_CONFIGS } from "./config-ui.js";

/**
 * Foundry's renderXxxConfig hook historically passed the form root as a jQuery
 * object (v13 and earlier).  In v14 it's a native HTMLElement.  Normalize both
 * shapes to a single HTMLElement so the rest of the integration is jQuery-free.
 */
function asNativeElement(html) {
	if (html instanceof HTMLElement) return html;
	// Accept jQuery-like objects without taking a hard dependency on $:
	// any wrapper exposing a numeric-indexed [0] entry that's an HTMLElement.
	const first = html?.[0];
	return first instanceof HTMLElement ? first : null;
}

for (const configName of TAGGABLE_CONFIGS) {
	Hooks.on(`render${configName}`, (app, html) => {
		const root = asNativeElement(html);
		if (!root) return;

		for (const tabId of TABBED_ANCHORS[configName] ?? []) {
			const tab = root.querySelector(`[data-tab="${tabId}"]:not([data-action])`);
			if (tab) return TaggerConfig._applyHtml(app, tab, false);
		}
		const named = root.querySelector(`button[name="submit"]`);
		const submit = named ?? root.querySelector(`button[type="submit"]`);
		TaggerConfig._applyHtml(app, submit?.parentElement ?? null, true);
	});
}

for (const obj of ["Actor", "Token", "Tile", "Drawing", "Wall", "AmbientLight", "AmbientSound", "MeasuredTemplate", "Note", "Region"]) {
	Hooks.on(`preUpdate${obj}`, (...args) => TaggerHandler.applyUpdateTags(...args));
	Hooks.on(`preCreate${obj}`, (...args) => TaggerHandler.preCreateApplyTags(...args));
}

Hooks.once('init', async function () {
	registerHotkeys();
	registerSidebarTabIntegration();
	window.Tagger = Tagger;
});
