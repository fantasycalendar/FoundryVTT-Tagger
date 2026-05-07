import CONSTANTS from "./constants.js";
import TaggerHandler from "./tagger-handler.js";

/**
 * @typedef {Object} GetByTagOptions
 * @property {Boolean} [matchAny]        whether the PlaceableObjects can contain any of the provided tags
 * @property {Boolean} [matchExactly]    whether the tags on the PlaceableObjects must contain ONLY the tags provided
 * @property {Boolean} [caseInsensitive] whether the search is case insensitive (capitals vs lowercase is not considered)
 * @property {Boolean} [allScenes]       whether to search in all scenes, this will return an object with the key as the scene ID, and an array for objects found within that scene
 * @property {Array}   [objects]         an array of PlaceableObjects to test
 * @property {Array}   [ignore]          an array of PlaceableObjects to ignore
 * @property {String}  [sceneId]         a string ID for the scene to search in
 * @property {Boolean} [returnObjects]   if true, returns the canvas PlaceableObject instances instead of the underlying Documents (falls back to the Document when the placeable is not on the active canvas)
 */

/**
 * @typedef {Object} HasTagsOptions
 * @property {Boolean} [matchAny]        whether the PlaceableObjects can contain any of the provided tags
 * @property {Boolean} [matchExactly]    whether the tags on the PlaceableObjects must contain ONLY the tags provided
 * @property {Boolean} [caseInsensitive] whether the search is case insensitive (capitals vs lowercase is not considered)
 */

export default class Tagger {

	/**
	 * Gets PlaceableObjects with matching tags provided to the method
	 *
	 * @example
	 * // Find objects whose tags contain "tag_to_find"
	 * const objects = Tagger.getByTag("tag_to_find");
	 *
	 * @example
	 * // Find objects with JUST and ONLY the tag "tag_to_find"
	 * const objects = Tagger.getByTag("tag_to_find", { matchExactly: true });
	 *
	 * @param    {String/RegExp/Array<String/RegExp>}  inTags      An array of tags or a string of tags (separated by commas) that will be searched for
	 * @param    {GetByTagOptions}                     [inOptions] An optional object that can contain any of the following:
	 *
	 * @returns  {Array}                                           Returns an array of filtered Documents (or PlaceableObjects when `returnObjects` is true) based on the tags
	 */
	static getByTag(inTags, inOptions = {}) {
		return Tagger._getObjectsByTags(inTags, inOptions, "getByTag");
	}

	/**
	 * Verifies whether a given PlaceableObject or Document has the tags given
	 *
	 * @example
	 * // Whether the selected token has the tag "tag_to_find"
	 * const objects = Tagger.hasTags(token, "tag_to_find");
	 *
	 * @example
	 * // Whether the token has a tag that resembles "tag_to_find" or "TAG_TO_FIND" or "tAg_To_FiNd"
	 * const objects = Tagger.hasTags(token, "TAG_to_FIND", { caseInsensitive: true });
	 *
	 * @param    {PlaceableObject/Array}  inObjects   A PlaceableObject, or an array of PlaceableObjects to check for tags on
	 * @param    {String/Array}           inTags      An array of tags or a string of tags (separated by commas) that will be searched for
	 * @param    {HasTagsOptions}         [inOptions] An optional object that can contain any of the following:
	 *
	 * @returns  {Boolean}                            Returns a boolean whether the object has the given tags
	 */
	static hasTags(inObjects, inTags, inOptions = {}) {
		const relevantObjects = this._validateObjects(inObjects, "setTags");
		return Tagger._getObjectsByTags(inTags, foundry.utils.mergeObject(inOptions, { objects: relevantObjects }), "hasTags").length > 0;
	}

	/**
	 * Gets all tags from a given PlaceableObject or Document
	 *
	 * @example
	 * // If the token has several tags, this method will return all of those tags as an array
	 * const tags = Tagger.getTags(token);
	 *
	 * @param    {PlaceableObject}  inObject    The PlaceableObject or Document get tags from
	 *
	 * @returns  {Array}                        An array of tags from the Document
	 */
	static getTags(inObject) {
		const relevantDocument = inObject?.document ?? inObject;
		const tags = relevantDocument?.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.TAGS) ?? [];
		return this._validateTags(tags, "getTags");
	}

	/**
	 * Set the tags on an PlaceableObject or Document, **completely overwriting existing tags on the object**
	 *
	 * @example
	 * // Sets the tags on the token to be ONLY "tag_to_set"
	 * await Tagger.setTags(token, "tag_to_set");
	 *
	 * @example
	 * // You can also set multiple tags with an array
	 * await Tagger.setTags(token, ["tag_to_set", "tag_to_also_set"]);
	 *
	 * @example
	 * // Or as a string with each tag separated with a comma
	 * await Tagger.setTags(token, "tag_to_set, tag_to_also_set");
	 *
	 * @param    {PlaceableObject/Array}    inObjects   A PlaceableObject, or an array of PlaceableObjects to set tags on
	 * @param    {String/Array}             inTags      An array of tags or a string of tags (separated by commas) that will override all tags on the PlaceableObjects
	 *
	 * @returns  {Promise}                              A promise that will resolve when the PlaceableObjects' tags have been updated
	 */
	static async setTags(inObjects, inTags = []) {
		const relevantObjects = this._validateObjects(inObjects, "setTags");
		const providedTags = this._validateTags(inTags, "setTags");
		return this._updateTags(relevantObjects, { inTags: providedTags, isSetting: true });
	}

	/**
	 * Toggles the tags on an PlaceableObject or Document. If a tag is present, it will be removed. If it not present, it will be added.
	 *
	 * @example
	 * // If the token had the tag "tag_to_toggle", it no longer has it
	 * await Tagger.toggleTags(token, "tag_to_toggle");
	 *
	 * @example
	 * // You can also toggle multiple tags with an array
	 * await Tagger.toggleTags(token, ["tag_to_toggle", "tag_to_also_toggle"]);
	 *
	 * @example
	 * // Or as a string with each tag separated with a comma
	 * await Tagger.toggleTags(token, "tag_to_toggle, tag_to_also_toggle");
	 *
	 * @param    {PlaceableObject/Array}    inObjects   A PlaceableObject, or an array of PlaceableObjects to toggle tags on
	 * @param    {String/Array}             inTags      An array of tags or a string of tags (separated by commas) that will be toggled on the PlaceableObjects
	 *
	 * @returns  {Promise}                              A promise that will resolve when the PlaceableObjects' tags have been updated
	 */
	static async toggleTags(inObjects, inTags = []) {
		const relevantObjects = this._validateObjects(inObjects, "toggleTags");
		const providedTags = this._validateTags(inTags, "toggleTags");
		return this._updateTags(relevantObjects, { inTags: providedTags, isToggling: true });
	}

	/**
	 * Adds tags to an object
	 *
	 * @example
	 * // Adds "tag_to_add" to the token's existing tags
	 * await Tagger.addTags(token, "tag_to_add");
	 *
	 * @param    {PlaceableObject/Array}    inObjects   A PlaceableObject, or an array of PlaceableObjects to add tags to
	 * @param    {String/Array}             inTags      An array of tags or a string of tags (separated by commas) that will be added to the PlaceableObjects
	 *
	 * @returns  {Promise}                              A promise that will resolve when the PlaceableObjects' tags have been updated
	 */
	static async addTags(inObjects, inTags) {
		const relevantObjects = this._validateObjects(inObjects, "addTags");
		const providedTags = this._validateTags(inTags, "addTags");
		return this._updateTags(relevantObjects, { inTags: providedTags });
	}

	/**
	 * Removes tags from an object
	 *
	 * @example
	 * // Removes "tag_to_remove" from the token's tags
	 * await Tagger.removeTags(token, "tag_to_remove");
	 *
	 * @param    {PlaceableObject/Array}    inObjects   A PlaceableObject, or an array of PlaceableObjects to remove tags from
	 * @param    {String/Array}             inTags      An array of tags or a string of tags (separated by commas) that will be removed from the PlaceableObjects
	 *
	 * @returns  {Promise}                              A promise that will resolve when the PlaceableObjects' tags have been updated
	 */
	static async removeTags(inObjects, inTags) {
		const relevantObjects = this._validateObjects(inObjects, "removeTags");
		const providedTags = this._validateTags(inTags, "removeTags");
		return this._updateTags(relevantObjects, { inTags: providedTags, isAdding: false });
	}

	/**
	 * Removes all tags from PlaceableObjects
	 *
	 * @example
	 * // Clears all tags from the given object
	 * await Tagger.clearAllTags(token);
	 *
	 * @param    {PlaceableObject/Array}    inObjects   The PlaceableObjects to remove all tags from
	 *
	 * @returns  {Promise}                              A promise that will resolve when the PlaceableObjects' tags have been updated
	 */
	static async clearAllTags(inObjects) {
		const relevantObjects = this._validateObjects(inObjects, "clearAllTags");
		return this._updateTags(relevantObjects);
	}

	/**
	 * Applies all tag rules to every tag found on the given PlaceableObjects
	 *
	 * @example
	 * // If the token has a tag that looks like this: "test_{#}_tag", running this method:
	 * await Tagger.applyTagRules(token);
	 * // The tag will now be "test_1_tag", but the number depends on how many other objects in the scene that also has that same tag
	 *
	 * @param    {PlaceableObject/Array}    inObjects   The PlaceableObjects to apply tag rules to
	 *
	 * @returns  {Promise}                              A promise that will resolve when the PlaceableObjects' tags have been updated
	 */
	static async applyTagRules(inObjects) {
		const relevantObjects = this._validateObjects(inObjects, "applyTagRules");
		return this._updateTags(relevantObjects, { applyRules: true });
	}

	/**
	 * Updates the tags on a given set of objects
	 *
	 * @param inObjects
	 * @param inTags
	 * @param isSetting
	 * @param isAdding
	 * @param isToggling
	 * @param applyRules
	 * @returns {Promise<void>}
	 * @private
	 */
	static async _updateTags(inObjects, {
		inTags = false,
		isSetting = false,
		isAdding = true,
		isToggling = false,
		applyRules = false
	} = {}) {

		if (!inTags && !applyRules) {
			for (let obj of inObjects) {
				await obj.unsetFlag(CONSTANTS.MODULE_NAME, CONSTANTS.TAGS);
			}
			return;
		}
		inTags = inTags || [];
		for (let obj of inObjects) {
			let tags = new Set(this.getTags(obj));
			if (isToggling) {
				const incomingTags = new Set(inTags);
				tags = Array.from(tags).filter(tag => {
					const hasTag = incomingTags.has(tag);
					if (hasTag) incomingTags.delete(tag);
					return !hasTag;
				});
				tags = new Set([...tags, ...incomingTags]);
			} else if (isSetting) {
				tags = new Set([...inTags]);
			} else if (isAdding) {
				tags = new Set([...tags, ...inTags]);
			} else {
				inTags.forEach(t => tags.delete(t));
			}
			if (tags.size === 0 && !applyRules) {
				await obj.unsetFlag(CONSTANTS.MODULE_NAME, CONSTANTS.TAGS);
			} else {
				tags = Array.from(tags);
				if (applyRules) {
					tags = TaggerHandler.applyRules(tags)
				}
				await obj.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.TAGS, tags);
			}
		}
	}

	/**
	 * Gets objects in a scene based on a given set of tags and options
	 *
	 * @param inTags
	 * @param inOptions
	 * @param inFunctionName
	 * @returns {*}
	 * @private
	 */
	static _getObjectsByTags(inTags, inOptions, inFunctionName) {

		const options = foundry.utils.mergeObject({
			objects: false,
			ignore: false,
			matchAny: false,
			allScenes: false,
			matchExactly: false,
			caseInsensitive: false,
			sceneId: game.canvas.id
		}, inOptions)

		if (typeof options.matchAny !== "boolean") throw new Error(`Tagger | ${inFunctionName} | options.matchAny must be of type boolean`);
		if (typeof options.caseInsensitive !== "boolean") throw new Error(`Tagger | ${inFunctionName} | options.caseInsensitive must be of type boolean`);
		if (typeof options.matchExactly !== "boolean") throw new Error(`Tagger | ${inFunctionName} | options.matchExactly must be of type boolean`);
		if (typeof options.allScenes !== "boolean") throw new Error(`Tagger | ${inFunctionName} | options.allScenes must be of type boolean`);
		if (options.matchAny && options.matchExactly) throw new Error(`Tagger | ${inFunctionName} | options.matchAny and options.matchExactly cannot both be true, they are opposites`);
		if (options.objects && !Array.isArray(options.objects)) throw new Error(`Tagger | ${inFunctionName} | options.objects must be of type array`);
		if (options.ignore && !Array.isArray(options.ignore)) throw new Error(`Tagger | ${inFunctionName} | options.ignore must be of type array`);
		if (!options.allScenes) {
			if (typeof options.sceneId !== "string") throw new Error(`Tagger | ${inFunctionName} | options.sceneId must be of type string`);
		}

		const providedTags = this._validateTags(inTags, inFunctionName)
			.map(t => t instanceof RegExp ? t : options.caseInsensitive ? t.toLowerCase() : t)
			.map(t => t instanceof RegExp ? t : `^${t}$`)
			.map(t => t instanceof RegExp ? t : new RegExp(t.replaceAll("*", "(.*?)")));

		if (options.allScenes) {
			return this._testTagsOnAllObjectsFromAllScenes(providedTags, options);
		}

		let scene = game.scenes.get(options.sceneId);
		if (!scene) throw new Error(`Tagger | ${inFunctionName} | could not find scene with id ${options.sceneId}`);

		if (!options.objects) {
			options.objects = this._getObjectsFromScene(scene);
		}

		return this._testObjectsTags(providedTags, options);

	}

	/**
	 * Gets all objects from all scenes based on a set of tags and options
	 *
	 * @param inTestTags
	 * @param options
	 * @returns {Object}
	 * @private
	 */
	static _testTagsOnAllObjectsFromAllScenes(inTestTags, options) {

		return Object.fromEntries(Array.from(game.scenes).map(scene => {

			const sceneOptions = foundry.utils.mergeObject(options, {
				objects: this._getObjectsFromScene(scene)
			});

			return [[scene.id], this._testObjectsTags(inTestTags, sceneOptions)];

		}).filter(entry => entry[1].length));

	}

	/**
	 * Gets all objects from a scene
	 *
	 * @param scene
	 * @returns {Array}
	 * @private
	 */
	static _getObjectsFromScene(scene) {
		return [
			...Array.from(scene.tokens),
			...Array.from(scene.lights),
			...Array.from(scene.sounds),
			...Array.from(scene.templates),
			...Array.from(scene.tiles),
			...Array.from(scene.walls),
			...Array.from(scene.drawings),
			...Array.from(scene.notes),
			...Array.from(scene.regions),
		].deepFlatten().filter(Boolean)
	}

	/**
	 * Tests objects' tags against a set of tags
	 *
	 * @param inTestTags
	 * @param options
	 * @returns {*}
	 * @private
	 */
	static _testObjectsTags(inTestTags, options) {

		if (options.ignore) {
			options.objects = options.objects.filter(obj => !options.ignore.includes(obj));
		}

		return options.objects.filter(obj => {
			return this._testObject(obj, inTestTags, options);
		}).map(obj => options.returnObjects ? (obj._object ?? obj) : obj);

	}

	/**
	 * Tests an object's tags against a set of tags
	 *
	 * @param inObject
	 * @param inTestTags
	 * @param options
	 * @returns {boolean|*}
	 * @private
	 */
	static _testObject(inObject, inTestTags, options) {

		let objectTags = this.getTags(inObject);

		if (!objectTags) return false;

		objectTags = objectTags.map(tag => options.caseInsensitive ? tag.toLowerCase() : tag)

		const matchedTags = inTestTags.filter(testTag => {
			return objectTags.filter(tag => {
				return testTag.test(tag);
			}).length;
		})

		if (options.matchAny) {
			return matchedTags.length;
		}

		if (options.matchExactly) {
			return matchedTags.length === inTestTags.length && objectTags.length === inTestTags.length;
		}

		return matchedTags.length >= inTestTags.length;

	}

	/**
	 * Validates tags so that we know they are clean
	 *
	 * @param inTags
	 * @param inFunctionName
	 * @returns {Array<string|RegExp>}
	 * @private
	 */
	static _validateTags(inTags, inFunctionName) {
		if (!(typeof inTags === "string" || inTags instanceof RegExp || Array.isArray(inTags))) throw new Error(`Tagger | ${inFunctionName} | inTags must be of type string or array`);

		let providedTags = typeof inTags === "string" ? inTags.split(",") : inTags;

		if (!Array.isArray(providedTags)) providedTags = [providedTags]

		providedTags.forEach(t => {
			if (!(typeof t === "string" || t instanceof RegExp)) throw new Error(`Tagger | ${inFunctionName} | tags in array must be of type string or regexp`);
		});

		return providedTags.map(t => t instanceof RegExp ? t : t.trim()).filter(Boolean);
	}

	/**
	 * Casts a set of objects to their documents
	 *
	 * @param inObjects
	 * @param inFunctionName
	 * @returns {Array<Document>}
	 * @private
	 */
	static _validateObjects(inObjects, inFunctionName) {
		let relevantObjects = Array.isArray(inObjects) ? inObjects : [inObjects];
		relevantObjects.forEach(obj => {
			if (!obj) throw new Error(`Tagger | ${inFunctionName} | Invalid object provided`);
		})
		return relevantObjects.map(obj => obj?.document ?? obj);
	}
}
