import CONSTANTS from "./constants.js";
import Tagger from "./tagger.js";
import TaggerHandler from "./tagger-handler.js";

// Configs whose Tagger fieldset is placed inside a specific tab pane. The value is the
// list of `data-tab` IDs to try in order, this covers v13/v14 differences (RegionConfig
// renamed its `identity` tab to `appearance` in v14).  Configs not listed here fall
// through to the generic "before form footer" placement below.
export const TABBED_ANCHORS = {
	TokenConfig: ["identity"],
	TileConfig: ["appearance"],
	DrawingConfig: ["position"],
	RegionConfig: ["identity", "appearance"],
};

export const TAGGABLE_CONFIGS = [
	"TokenConfig", "TileConfig", "DrawingConfig", "RegionConfig",
	"AmbientLightConfig", "AmbientSoundConfig", "WallConfig",
	"MeasuredTemplateConfig", "NoteConfig",
];

const tagManagers = {};

export class TaggerConfig {

	static _applyHtml(app, elem, insertBefore = false) {
		if (!elem) {
			console.warn(`Tagger | could not find an anchor element to attach the tag editor to in ${app.constructor.name}; the Tagger field will not be rendered. This usually means Foundry renamed the tab or submit button this config relies on.`);
			return;
		}
		const tagDocument = app.document;
		tagManagers[tagDocument.uuid] = new TagManager(tagDocument, app, elem, insertBefore);
	}
}

class TagManager {

	constructor(tagDocument, app, elem, insertBefore) {
		this._tags = [];
		this.tagDocument = tagDocument;
		this.app = app;
		this.elem = elem;
		this.insertBefore = insertBefore;
		this.createElements()
		this.tags = Tagger.getTags(this.tagDocument).filter(Boolean);
		this.closing = false;
		this.dropIndex = null;
	}

	get tags() {
		return this._tags;
	}

	set tags(tags) {
		this._tags = Array.from(new Set(tags.map(tag => tag.trim()).filter(Boolean)));
		this.hiddenInput.value = this._tags.join(",");
		if (this.closing) return;
		this.populateTags();
	}

	createElements() {

		const fieldset = document.createElement("fieldset");
		fieldset.setAttribute("class", "tagger");

		fieldset.ondrop = (evt) => {
			let dropData = false;

			try {
				dropData = JSON.parse(evt.dataTransfer.getData("text/plain"));
			} catch (err) {
				return;
			}

			if (!dropData.uuid || !dropData.tag) return;

			if (dropData.uuid === this.tagDocument.uuid) {
				const toTags = this.tags;
				toTags.splice(toTags.indexOf(dropData.tag), 1)
				toTags.splice(this.dropIndex ?? toTags.length, 0, dropData.tag)
				this.tags = toTags;
				return;
			}

			const toTags = this.tags;
			if (toTags.includes(dropData.tag)) return;
			toTags.splice(this.dropIndex ?? toTags.length, 0, dropData.tag)
			this.tags = toTags;

			// Source config may have been closed since the drag started; in that case
			// we keep the new tag here and skip the source-side bookkeeping.
			const sourceManager = tagManagers[dropData.uuid];
			if (sourceManager) {
				const fromTags = sourceManager.tags;
				fromTags.splice(dropData.index, 1);
				sourceManager.tags = fromTags;
			}
		}

		const legend = document.createElement("legend");
		legend.innerHTML = "Tagger (press enter to complete)";
		fieldset.appendChild(legend);

		const inputContainer = document.createElement("div");
		inputContainer.setAttribute("class", "form-group");

		this.input = document.createElement("input");
		this.input.setAttribute("type", "text");
		this.input.onkeydown = (evt) => this.inputKeyDown(evt);
		// Any further interaction with the input means the form is still alive (e.g. a
		// submit was rejected by validation), so clear the closing flag that was set by
		// the submit-button handler. Otherwise populateTags() and the input-clear in
		// addTagsFromInput() stay suppressed for the rest of this app's lifetime.
		this.input.addEventListener("focus", () => { this.closing = false; });
		this.input.addEventListener("input", () => { this.closing = false; });

		inputContainer.appendChild(this.input);

		this.hiddenInput = document.createElement("input");
		this.hiddenInput.setAttribute("type", "hidden");
		this.hiddenInput.setAttribute("name", CONSTANTS.TAG_PROPERTY);

		inputContainer.appendChild(this.hiddenInput);

		const addTagButton = document.createElement("button");
		addTagButton.setAttribute("type", "button");
		addTagButton.setAttribute("style", "min-width: 65px;");
		addTagButton.innerHTML = "Add tags";
		addTagButton.onclick = () => this.addTagsFromInput();
		inputContainer.appendChild(addTagButton);

		const applyRulesButton = document.createElement("button");
		applyRulesButton.setAttribute("type", "button");
		applyRulesButton.setAttribute("data-tooltip", "Apply tag rules");
		applyRulesButton.onclick = () => this.applyRulesButtonClicked();

		inputContainer.appendChild(applyRulesButton);

		const applyRulesIcon = document.createElement("i");
		applyRulesIcon.setAttribute("class", "fas fa-check");
		applyRulesButton.appendChild(applyRulesIcon);

		this.tagContainer = document.createElement("div");
		this.tagContainer.setAttribute("class", "tag-container");

		fieldset.appendChild(inputContainer);
		fieldset.appendChild(this.tagContainer);

		if (this.insertBefore) {
			this.elem.before(fieldset);
		} else {
			this.elem.append(fieldset);
		}

		// Find the form's last submit button and flush any half-typed input on click,
		// so the user doesn't lose work by clicking submit before pressing enter.
		const form = this.elem.closest("form");
		if (form) {
			const submits = form.querySelectorAll('button[type="submit"]');
			const lastSubmit = submits[submits.length - 1];
			if (lastSubmit) {
				lastSubmit.addEventListener("click", () => {
					this.closing = true;
					this.addTagsFromInput();
				});
			}
		}
	}

	addTagsFromInput() {
		const tag = Tagger._validateTags(this.input.value, "Add Tags");
		this.tags = this.tags.concat(tag);
		if (this.closing) return;
		this.input.value = "";
	}

	applyRulesButtonClicked() {
		this.tags = TaggerHandler.applyRules(this.tags);
	}

	removeButtonClicked(index) {
		const newTags = this.tags;
		newTags.splice(index, 1);
		this.tags = newTags;
	}

	inputKeyDown(evt) {
		if (evt.key !== "Enter") return;
		evt.preventDefault();
		evt.stopPropagation();
		this.addTagsFromInput();
	}

	editTagClicked(index) {
		const tag = this.tags[index];
		this.removeButtonClicked(index);
		let currentInput = this.input.value.trim();
		if (currentInput) {
			currentInput += ", " + tag;
		} else {
			currentInput = tag;
		}
		this.input.value = currentInput;
		this.input.focus();
	}

	populateTags() {
		this.tagContainer.innerHTML = "";
		for (const [index, tag] of this.tags.entries()) {
			const tagString = tag.trim();
			if (!tagString) continue;
			this.createTagElement(tagString, index)
		}
		this.tagContainer.style.display = this.tagContainer.children.length ? "flex" : "none";
		this.app.setPosition({ height: "auto" });
	}

	createTagElement(tag, index) {

		const div = document.createElement("div");
		div.setAttribute("class", "tag");
		div.setAttribute("draggable", "true");
		div.ondragstart = (evt) => {
			evt.dataTransfer.setData("text/plain", JSON.stringify({ tag, index, uuid: this.tagDocument.uuid }));
		}
		div.ondragover = () => {
			this.dropIndex = index;
			div.classList.add('dropping');
		}
		div.ondragleave = (evt) => {
			if (evt.target.className.includes("tag-drop-ignore")) return;
			this.dropIndex = null;
			div.classList.remove('dropping');
		}

		const span = document.createElement("span");
		span.setAttribute("class", "tag-drop-ignore");
		span.innerHTML = tag;

		span.onclick = () => this.editTagClicked(index);
		const closeButton = document.createElement("i");
		closeButton.setAttribute("class", "fas fa-times tag-drop-ignore");
		closeButton.onclick = () => this.removeButtonClicked(index);

		div.appendChild(span);
		div.appendChild(closeButton);

		this.tagContainer.appendChild(div);

	}

}
