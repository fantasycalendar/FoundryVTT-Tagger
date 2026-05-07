import CONSTANTS from "./constants.js";
import Tagger from "./tagger.js";
import { hotkeyState } from "./hotkeys.js";

let temporaryIds = {};

export default class TaggerHandler {

	static applyUpdateTags(inDocument, updateData) {
		let propertyName = CONSTANTS.TAG_PROPERTY;
		if (inDocument instanceof Actor) propertyName = "prototypeToken." + propertyName;
		let tags = foundry.utils.getProperty(updateData, propertyName);
		if (tags === undefined) return;
		if (!tags?.length) {
			propertyName = propertyName.replace(CONSTANTS.TAG_PROPERTY, CONSTANTS.REMOVE_TAG_PROPERTY);
			tags = null;
		} else {
			tags = Tagger._validateTags(tags, "_applyTags");
		}
		foundry.utils.setProperty(updateData, propertyName, tags);
	}

	static preCreateApplyTags(inDocument, documentData) {
		if (hotkeyState.dropNoRules) return;
		temporaryIds = {};
		this.applyCreateTags(documentData);
		temporaryIds = {};
		const flags = foundry.utils.getProperty(documentData, "flags");
		return inDocument.updateSource({ flags });
	}

	static applyCreateTags(documentData) {

		const preprocessed = foundry.utils.getProperty(documentData, `${CONSTANTS.DATA_PROPERTY}.preprocessed`);
		if (preprocessed) {
			foundry.utils.setProperty(documentData, `${CONSTANTS.DATA_PROPERTY}.preprocessed`, false);
			return;
		}

		let tags = foundry.utils.getProperty(documentData, CONSTANTS.TAG_PROPERTY);

		if (tags) {
			tags = this.applyRules(tags);
			foundry.utils.setProperty(documentData, CONSTANTS.TAG_PROPERTY, tags);
		}

		if (game.modules.get("token-attacher")?.active) {
			this.recurseTokenAttacher(documentData);
		}

		if (game.modules.get("monks-active-tiles")?.active) {
			const monkActions = documentData?.flags?.["monks-active-tiles"]?.actions ?? [];
			const names = ["location.name", "entity.name"];
			const ids = ["location.id", "entity.id"];
			monkActions.forEach((action, i) => {
				for (const nameProperty of names) {
					let locationName = foundry.utils.getProperty(action?.data, nameProperty);
					if (locationName && locationName.startsWith("[Tagger] ")) {
						const tags = locationName.replace("[Tagger] ", "");
						const newTags = this.applyRules(tags).join(", ");
						foundry.utils.setProperty(documentData, `flags.monks-active-tiles.actions.${i}.data.` + nameProperty, `[Tagger] ${newTags}`);
					}
				}

				for (const idProperty of ids) {
					let locationId = foundry.utils.getProperty(action?.data, idProperty);
					if (locationId && locationId.startsWith("tagger:")) {
						const tags = locationId.replace("tagger:", "");
						const newTags = this.applyRules(tags).join(", ");
						foundry.utils.setProperty(documentData, `flags.monks-active-tiles.actions.${i}.data.` + idProperty, `tagger:${newTags}`);
					}
				}
			});

			let monkEntity = documentData?.flags?.["monks-active-tiles"]?.entity;
			if (monkEntity) {
				let reparse = false;
				if (typeof monkEntity === "string") {
					monkEntity = JSON.parse(monkEntity);
					foundry.utils.setProperty(documentData, `flags.monks-active-tiles.entity`, monkEntity);
					reparse = true;
				}
				let entityId = foundry.utils.getProperty(monkEntity, "id");
				if (entityId && entityId.startsWith("tagger:")) {
					const tags = entityId.replace("tagger:", "");
					const newTags = this.applyRules(tags).join(", ");
					foundry.utils.setProperty(documentData, `flags.monks-active-tiles.entity.id`, `tagger:${newTags}`);
				}
				if (reparse) {
					foundry.utils.setProperty(documentData, `flags.monks-active-tiles.entity`, JSON.stringify(monkEntity));
				}
			}

		}

	}

	static recurseTokenAttacher(documentData) {
		const prototypeAttached = foundry.utils.getProperty(documentData, "flags.token-attacher.prototypeAttached");
		if (prototypeAttached) {
			for (const objects of Object.values(prototypeAttached)) {
				for (const object of objects) {
					this.applyCreateTags(object)
					foundry.utils.setProperty(object, `${CONSTANTS.DATA_PROPERTY}.preprocessed`, true);
				}
			}
		}
	}

	static applyRules(tags) {

		const tagRules = Object.entries(this.rules).filter(entry => {
			entry[0] = new RegExp(`${entry[0]}`, "g");
			return entry;
		});

		tags = Tagger._validateTags(tags, "TaggerHandler");

		return tags.map((tag, index) => {

			const applicableTagRules = tagRules.filter(([regx]) => {
				return tag.match(regx)
			});
			if (!applicableTagRules.length) return tag;

			applicableTagRules.forEach(([regx, method]) => {
				tag = method(tag, regx, index);
			})

			return tag;
		});

	}

	static rules = {

		/**
		 * Replaces a portion of the tag with a number based on how many objects in this scene has the same numbered tag
		 * @private
		 */
		"{#}": (tag, regx) => {
			const findTag = new RegExp("^" + tag.replace(regx, "([1-9]+[0-9]*)") + "$");
			const existingDocuments = Tagger.getByTag(findTag)
			if (!existingDocuments.length) return tag.replace(regx, 1);

			const numbers = existingDocuments.map(existingDocument => {
				return Number(Tagger.getTags(existingDocument).find(tag => {
					return tag.match(findTag);
				}).match(findTag)[1]);
			})

			const length = Math.max(...numbers) + 1;
			for (let i = 1; i <= length; i++) {
				if (!numbers.includes(i)) {
					return tag.replace(regx, i)
				}
			}
		},

		/**
		 *  Replaces the section of the tag with a random ID
		 *  @private
		 */
		"{id}": (tag, regx, index) => {
			let id = temporaryIds?.[tag]?.[index];
			if (!id) {
				if (!temporaryIds?.[tag]) {
					temporaryIds[tag] = []
				}
				id = foundry.utils.randomID();
				temporaryIds[tag].push(id);
			}
			return tag.replace(regx, id);
		}
	}
}
