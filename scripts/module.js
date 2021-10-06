class Tagger {

    static MODULE_NAME = "tagger"
    static FLAG_NAME = "tags"

    /**
     * Gets all tags from a given PlaceableObject
     *
     * @param    {PlaceableObject}  inObject    The PlaceableObject get tags from
     *
     * @returns  {array}                        An array of tags from the PlaceableObject
     */
    static getTags(inObject) {
        const relevantDocument = inObject?.document ?? inObject;
        const tags = relevantDocument?.getFlag(this.MODULE_NAME, this.FLAG_NAME) ?? [];
        return this._validateTags(tags, "getTags");
    }

    /**
     * Gets PlaceableObjects with matching tags provided to the method
     *
     * @param    {string|array}     inTags      An array of tags or a string of tags (separated by commas) that will be searched for
     * @param    {object}           inOptions   An optional object that can contain any of the following:
     *                                              - matchAny {boolean}        - whether the PlaceableObjects can contain any of the provided tags to be matched
     *                                              - caseInsensitive {boolean} - whether the search is case insensitive (capitals vs lowercase is not considered)
     *                                              - objects {array}           - an array of PlaceableObjects to test
     *                                              - ignore {array}            - an array of PlaceableObjects to ignore
     *                                              - sceneId {string}          - a string ID for the scene to search in
     *
     * @returns  {Promise}                      A promise that will resolve when all PlaceableObjects have been found, returning an array of PlaceableObjects
     */
    static getByTag(inTags, inOptions = {}) {

        return new Promise(resolve => {

            let options = foundry.utils.mergeObject({
                objects: [],
                ignore: [],
                matchAny: false,
                caseInsensitive: false,
                sceneId: game.canvas.id
            }, inOptions)

            const providedTags = this._validateTags(inTags, "getByTag")
                .map(t => options.caseInsensitive ? t.toLowerCase() : t)
                .map(t => new RegExp(t.replace(/[^A-Za-z0-9 .*_-]/g, "").replace(".", "\.").replace("*", "(.*?)")))

            if (typeof options.matchAny === "boolean") throw new Error("Tagger | getByTag | options.matchAny must be of type boolean");
	        if (typeof options.caseInsensitive === "boolean") throw new Error("Tagger | getByTag | options.caseInsensitive must be of type boolean");
            if (!Array.isArray(options.objects)) throw new Error("Tagger | getByTag | options.objects must be of type array");
            if (!Array.isArray(options.ignore)) throw new Error("Tagger | getByTag | options.ignore must be of type array");
            if (typeof options.sceneId !== "string") throw new Error("Tagger | getByTag | options.sceneId must be of type string");
            let scene = game.scenes.get(options.sceneId);
            if (!scene) throw new Error(`Tagger | getByTag | could not find scene with id ${options.sceneId}`);

            if (!options.objects.length) {
                options.objects = this._getObjectsFromScene(scene)
            }

            options.objects = options.objects.filter(obj => !options.ignore.includes(obj));

            resolve(options.objects.filter(obj => {
                const objectTags = this.getTags(obj);
                return objectTags && this._testTags(providedTags, objectTags, options);
            }).map(obj => obj?._object ?? obj));

        });
    }

    static _getObjectsFromScene(scene) {
        return [
            ...Array.from(scene.tokens),
            ...Array.from(scene.lights),
            ...Array.from(scene.sounds),
            ...Array.from(scene.templates),
            ...Array.from(scene.tiles),
            ...Array.from(scene.walls),
            ...Array.from(scene.drawings),
        ].deepFlatten().filter(Boolean)
    }

    static _testTags(inTestTags, inTags, options) {

        const objectTags = inTags.map(tag => options.caseInsensitive ? tag.toLowerCase() : tag)

        const matches = inTestTags.filter(testTag => {
            return objectTags.filter(tag => {
                return testTag.test(tag);
            }).length;
        })

        if (options.matchAny) {
            return matches.length;
        }

        return matches.length === objectTags.length;
        
    }

    /**
     * Set the tags on an PlaceableObject
     *
     * @param    {PlaceableObject|array}    inObjects   A PlaceableObject or an array of PlaceableObjects to set tags on
     * @param    {string|array}             inTags      An array of tags or a string of tags (separated by commas) that will override all tags on the PlaceableObjects
     *
     * @returns  {promise}                              A promise that will resolve when the PlaceableObjects' tags have been updated
     */
    static async setTags(inObjects, inTags = []) {
        const relevantObjects = this._validateObjects(inObjects, "setTags");
        const providedTags = this._validateTags(inTags, "setTags");
        return this._updateTags(relevantObjects, providedTags, { isSetting: true });
    }

    /**
     * Adds tags to an object
     *
     * @param    {PlaceableObject|array}    inObjects   A PlaceableObject or an array of PlaceableObjects to add tags to
     * @param    {string|array}             inTags      An array of tags or a string of tags (separated by commas) that will be added to the PlaceableObjects
     *
     * @returns  {promise}                              A promise that will resolve when the tags have been updated
     */
    static async addTags(inObjects, inTags) {
        const relevantObjects = this._validateObjects(inObjects, "addTags");
        const providedTags = this._validateTags(inTags, "addTags");
        return this._updateTags(relevantObjects, providedTags);
    }

    /**
     * Removes tags from an object
     *
     * @param    {PlaceableObject|array}    inObjects   A PlaceableObject or an array of PlaceableObjects to remove tags from
     * @param    {string|array}             inTags      An array of tags or a string of tags (separated by commas) that will be removed from the PlaceableObjects
     *
     * @returns  {promise}                              A promise that will resolve when the tags have been updated
     */
    static async removeTags(inObjects, inTags) {
        const relevantObjects = this._validateObjects(inObjects, "removeTags");
        const providedTags = this._validateTags(inTags, "removeTags");
        return this._updateTags(relevantObjects, providedTags, { isAdding: false });
    }

    /**
     * Removes all tags from PlaceableObjects
     *
     * @param    {PlaceableObject|array}    inObjects   The PlaceableObjects to remove all tags from
     *
     * @returns  {promise}                              A promise that will resolve when the tags have been updated
     */
    static async clearAllTags(inObjects) {
        const relevantObjects = this._validateObjects(inObjects, "clearAllTags");
        return this._updateTags(relevantObjects, false);
    }

    /**
     * Updates tags on the PlaceableObject
     *
     * @param    {PlaceableObject|array}    inObjects   The PlaceableObjects to remove all tags from
     * @param    {array|boolean}            inTags      The tags to update the PlaceableObjects with, false clears tags
     * @param    {boolean}                  isSetting   Whether to override any existing tags on the PlaceableObjects
     * @param    {boolean}                  isAdding    Whether to add to the tags (if false, it removes from the tags)
     *
     * @returns  {promise}                              A promise that will resolve when the tags have been updated
     */
    static _updateTags(inObjects, inTags, { isSetting = false, isAdding = true } = {}) {
        return new Promise(async (resolve) => {
            if (inTags) {
                for (let obj of inObjects) {
                    let tags = new Set(this.getTags(obj));
                    if (isSetting) {
                        tags = new Set([...inTags]);
                    } else if (isAdding) {
                        tags = new Set([...tags, ...inTags]);
                    } else {
                        inTags.forEach(t => tags.delete(t));
                    }
                    if (tags.size === 0) {
                        await obj.unsetFlag(this.MODULE_NAME, this.FLAG_NAME);
                    } else {
                        await obj.setFlag(this.MODULE_NAME, this.FLAG_NAME, Array.from(tags));
                    }
                }
            } else {
                for (let obj of inObjects) {
                    await obj.unsetFlag(this.MODULE_NAME, this.FLAG_NAME);
                }
            }
            resolve();
        })
    }

    static _validateTags(inTags, functionName) {
        if (!(typeof inTags === "string" || Array.isArray(inTags))) throw new Error(`Tagger | ${functionName} | inTags must be of type string or array`);

        let providedTags = typeof inTags === "string" ? inTags.split(",") : inTags;

        providedTags.forEach(t => {
            if (typeof t !== "string") throw new Error(`Tagger | ${functionName} | tags in array must be of type string`);
        });

        return providedTags.map(t => t.trim());
    }

    static _validateObjects(inObjects, functionName) {
        let relevantObjects = Array.isArray(inObjects) ? inObjects : [inObjects];
        relevantObjects.forEach(obj => {
            if (!obj) throw new Error(`Tagger | ${functionName} | Invalid object provided`);
        })
        return relevantObjects.map(obj => obj?.document ?? obj);
    }
}

class TaggerConfig {

    static _handleRenderFormApplication(app, html){
        const found = configHandlers.find(config => app instanceof config.classType);
        if (!found) return;
        TaggerConfig[found.method](app, html, true);
    }

    static _handleTokenConfig(app, html) {
        const elem = html.find(`div[data-tab="character"]`);
        this._applyHtml(app, elem);
    }

    static _handleTileConfig(app, html) {
        const elem = html.find(`div[data-tab="basic"]`);
        this._applyHtml(app, elem);
    }

    static _handleDrawingConfig(app, html) {
        const elem = html.find(`div[data-tab="position"]`);
        this._applyHtml(app, elem);
    }

    static _handleGenericConfig(app, html) {
        const elem = html.find(`button[name="submit"]`);
        this._applyHtml(app, elem, true);
    }

    static _applyHtml(app, elem, insertBefore = false) {
        if (!elem) return;

        const tags = app?.object instanceof Actor
            ? Tagger._validateTags(getProperty(app?.object, "data.token.flags.tagger.tags") ?? [], "_applyHtml")
            : Tagger.getTags(app?.object?._object);

        const html = `
        <fieldset style="margin: 3px 0;">
			<legend>Tags (separated by commas)</legend>
			<div class="form-group">
				<input name="flags.${Tagger.MODULE_NAME}.${Tagger.FLAG_NAME}" type="text" value="${tags.join(', ')}">
			</div>
		</fieldset>
		`;

        if (insertBefore) {
            $(html).insertBefore(elem);
        } else {
            elem.append(html);
        }
        app.setPosition({ height: "auto" });
    }

    static _applyTags(document, updateData) {
        let propertyName = "flags.tagger.tags";
        if(document instanceof Actor) propertyName = "token." + propertyName;
        const tags = getProperty(updateData, propertyName);
        if(tags) setProperty(updateData, propertyName, Tagger._validateTags(tags, "_applyTags"));
    }

}

const configHandlers = [
    { classType: TokenConfig, method: "_handleTokenConfig" },
    { classType: TileConfig, method: "_handleTileConfig" },
    { classType: DrawingConfig, method: "_handleDrawingConfig" },
    { classType: WallConfig, method: "_handleGenericConfig" },
    { classType: LightConfig, method: "_handleGenericConfig" },
    { classType: AmbientSoundConfig, method: "_handleGenericConfig" },
    { classType: MeasuredTemplateConfig, method: "_handleGenericConfig" },
    { classType: NoteConfig, method: "_handleGenericConfig" }
]

Hooks.on("renderFormApplication", TaggerConfig._handleRenderFormApplication);

Hooks.on("preUpdateActor", TaggerConfig._applyTags.bind(TaggerConfig));
Hooks.on("preUpdateToken", TaggerConfig._applyTags.bind(TaggerConfig));
Hooks.on("preUpdateTile", TaggerConfig._applyTags.bind(TaggerConfig));
Hooks.on("preUpdateDrawing", TaggerConfig._applyTags.bind(TaggerConfig));
Hooks.on("preUpdateWall", TaggerConfig._applyTags.bind(TaggerConfig));
Hooks.on("preUpdateLight", TaggerConfig._applyTags.bind(TaggerConfig));
Hooks.on("preUpdateAmbientSound", TaggerConfig._applyTags.bind(TaggerConfig));
Hooks.on("preUpdateMeasuredTemplate", TaggerConfig._applyTags.bind(TaggerConfig));
Hooks.on("preUpdateNote", TaggerConfig._applyTags.bind(TaggerConfig));

Hooks.once('ready', async function () {
    window.Tagger = Tagger;
});
