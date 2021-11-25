class Tagger {

    static MODULE_NAME = "tagger"
    static FLAG_NAME = "tags"

    /**
     * Gets PlaceableObjects with matching tags provided to the method
     *
     * @param    {String|Array}     inTags      An array of tags or a string of tags (separated by commas) that will be searched for
     * @param    {Object}           inOptions   An optional object that can contain any of the following:
     *                                              - matchAny {Boolean}        - whether the PlaceableObjects can contain any of the provided tags
     *                                              - matchExactly {Boolean}    - whether the tags on the PlaceableObjects must contain ONLY the tags provided
     *                                              - caseInsensitive {Boolean} - whether the search is case insensitive (capitals vs lowercase is not considered)
     *                                              - allScenes {Boolean}       - whether to search in all scenes, this will return an object with the key
     *                                                                            as the scene ID, and an array for objects found within that scene
     *                                              - returnObjects {Boolean}   - whether to return the object rather than the Document
     *                                              - objects {Array}           - an array of PlaceableObjects to test
     *                                              - ignore {Array}            - an array of PlaceableObjects to ignore
     *                                              - sceneId {String}          - a string ID for the scene to search in
     *
     * @returns  {Array}                        Returns an array of filtered Documents based on the tags
     */
    static getByTag(inTags, inOptions = {}) {
        return Tagger._getObjectsByTags(inTags, inOptions, "getByTag");
    }

    /**
     * Verifies whether a given PlaceableObject or Document has the tags given
     *
     * @param    {PlaceableObject}    inObject    A PlaceableObject, or an array of PlaceableObjects to check for tags on
     * @param    {String|Array}       inTags      An array of tags or a string of tags (separated by commas) that will be searched for
     * @param    {Object}             inOptions   An optional object that can contain any of the following:
     *                                              - matchAny {Boolean}        - whether the PlaceableObjects can contain any of the provided tags
     *                                              - matchExactly {Boolean}    - whether the tags on the PlaceableObjects must contain ONLY the tags provided
     *                                              - caseInsensitive {Boolean} - whether the search is case insensitive (capitals vs lowercase is not considered)
     *
     * @returns  {Boolean}                        Returns a boolean whether the object has the given tags
     */
    static async hasTags(inObject, inTags, inOptions={}){
        return Tagger._getObjectsByTags(inTags, foundry.utils.mergeObject(inOptions, { objects: [inObject] }), "hasTags").length > 0;
    }

    /**
     * Gets all tags from a given PlaceableObject or Document
     *
     * @param    {PlaceableObject}  inObject    The PlaceableObject or Document get tags from
     *
     * @returns  {Array}                        An array of tags from the Document
     */
    static getTags(inObject) {
        const relevantDocument = inObject?.document ?? inObject;
        const tags = relevantDocument?.getFlag(this.MODULE_NAME, this.FLAG_NAME) ?? [];
        return this._validateTags(tags, "getTags");
    }

    /**
     * Set the tags on an PlaceableObject or Document
     *
     * @param    {PlaceableObject|Array}    inObjects   A PlaceableObject, or an array of PlaceableObjects to set tags on
     * @param    {String|Array}             inTags      An array of tags or a string of tags (separated by commas) that will override all tags on the PlaceableObjects
     *
     * @returns  {Promise}                              A promise that will resolve when the PlaceableObjects' tags have been updated
     */
    static async setTags(inObjects, inTags = []) {
        const relevantObjects = this._validateObjects(inObjects, "setTags");
        const providedTags = this._validateTags(inTags, "setTags");
        return this._updateTags(relevantObjects, providedTags, { isSetting: true });
    }

    /**
     * Adds tags to an object
     *
     * @param    {PlaceableObject|Array}    inObjects   A PlaceableObject, or an array of PlaceableObjects to add tags to
     * @param    {String|Array}             inTags      An array of tags or a string of tags (separated by commas) that will be added to the PlaceableObjects
     *
     * @returns  {Promise}                              A promise that will resolve when the PlaceableObjects' tags have been updated
     */
    static async addTags(inObjects, inTags) {
        const relevantObjects = this._validateObjects(inObjects, "addTags");
        const providedTags = this._validateTags(inTags, "addTags");
        return this._updateTags(relevantObjects, providedTags);
    }

    /**
     * Removes tags from an object
     *
     * @param    {PlaceableObject|Array}    inObjects   A PlaceableObject, or an array of PlaceableObjects to remove tags from
     * @param    {String|Array}             inTags      An array of tags or a string of tags (separated by commas) that will be removed from the PlaceableObjects
     *
     * @returns  {Promise}                              A promise that will resolve when the PlaceableObjects' tags have been updated
     */
    static async removeTags(inObjects, inTags) {
        const relevantObjects = this._validateObjects(inObjects, "removeTags");
        const providedTags = this._validateTags(inTags, "removeTags");
        return this._updateTags(relevantObjects, providedTags, { isAdding: false });
    }

    /**
     * Removes all tags from PlaceableObjects
     *
     * @param    {PlaceableObject|Array}    inObjects   The PlaceableObjects to remove all tags from
     *
     * @returns  {Promise}                              A promise that will resolve when the PlaceableObjects' tags have been updated
     */
    static async clearAllTags(inObjects) {
        const relevantObjects = this._validateObjects(inObjects, "clearAllTags");
        return this._updateTags(relevantObjects, false);
    }

    /**
     * Updates tags on the PlaceableObject
     *
     * @param    {PlaceableObject|Array}    inObjects   The PlaceableObjects to remove all tags from
     * @param    {array|boolean}            inTags      The tags to update the PlaceableObjects with, false clears tags
     * @param    {Boolean}                  isSetting   Whether to override any existing tags on the PlaceableObjects
     * @param    {Boolean}                  isAdding    Whether to add to the tags (if false, it removes from the tags)
     *
     * @returns  {Promise}                              A promise that will resolve when the tags have been updated
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

    static _getObjectsByTags(inTags, inOptions, inFunctionName){

        let options = foundry.utils.mergeObject({
            objects: false,
            ignore: false,
            matchAny: false,
            allScenes: false,
            returnObjects: false,
            matchExactly: false,
            caseInsensitive: false,
            sceneId: game.canvas.id
        }, inOptions)

        if(!inTags.length) throw new Error(`Tagger | ${inFunctionName} | inTags must be a string or an array`);

        if (typeof options.matchAny !== "boolean") throw new Error(`Tagger | ${inFunctionName} | options.matchAny must be of type boolean`);
        if (typeof options.caseInsensitive !== "boolean") throw new Error(`Tagger | ${inFunctionName} | options.caseInsensitive must be of type boolean`);
        if (typeof options.matchExactly !== "boolean") throw new Error(`Tagger | ${inFunctionName} | options.matchExactly must be of type boolean`);
        if (typeof options.allScenes !== "boolean") throw new Error(`Tagger | ${inFunctionName} | options.allScenes must be of type boolean`);
        if (typeof options.returnObjects !== "boolean") throw new Error(`Tagger | ${inFunctionName} | options.returnObjects must be of type boolean`);
        if (options.matchAny && options.matchExactly) throw new Error(`Tagger | ${inFunctionName} | options.matchAny and options.matchExactly cannot both be true, they are opposites`);
        if (options.objects && !Array.isArray(options.objects)) throw new Error(`Tagger | ${inFunctionName} | options.objects must be of type array`);
        if (options.ignore && !Array.isArray(options.ignore)) throw new Error(`Tagger | ${inFunctionName} | options.ignore must be of type array`);
        if (typeof options.sceneId !== "string") throw new Error(`Tagger | ${inFunctionName} | options.sceneId must be of type string`);
        let scene = game.scenes.get(options.sceneId);
        if (!scene) throw new Error(`Tagger | ${inFunctionName} | could not find scene with id ${options.sceneId}`);

        const providedTags = this._validateTags(inTags, inFunctionName)
            .map(t => options.caseInsensitive ? t.toLowerCase() : t)
            .map(t => `^${t}$`)
            .map(t => new RegExp(t.replace(".", "\.").replace("*", "(.*?)")))

        if (!options.objects) {
            if(options.allScenes) {
                return this._getObjectsFromAllScenes(providedTags, options);
            }else{
                options.objects = this._getObjectsFromScene(scene);
            }
        }

        return this._testObjects(providedTags, options);

    }

    static _getObjectsFromAllScenes(inTestTags, options){

        return Object.fromEntries(Array.from(game.scenes).map(scene => {

            const sceneOptions = foundry.utils.mergeObject(options, {
                objects: this._getObjectsFromScene(scene)
            });

            return [[scene.id], this._testObjects(inTestTags, sceneOptions)];

        }).filter(entry => entry[1].length));

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

    static _testObjects(inTestTags, options){

        if(options.ignore) {
            options.objects = options.objects.filter(obj => !options.ignore.includes(obj));
        }

        return options.objects.filter(obj => {
            return this._testObject(obj, inTestTags, options);
        }).map(obj => options.returnObjects ? (obj._object ?? obj) : obj);

    }

    static _testObject(inObject, inTestTags, options) {

        let objectTags = this.getTags(inObject);

        if(!objectTags) return false;

        objectTags = objectTags.map(tag => options.caseInsensitive ? tag.toLowerCase() : tag)

        const matchedTags = inTestTags.filter(testTag => {
            return objectTags.filter(tag => {
                return testTag.test(tag);
            }).length;
        })

        if (options.matchAny) {
            return matchedTags.length;
        }

        if(options.matchExactly){
            return matchedTags.length === inTestTags.length && objectTags.length === inTestTags.length;
        }

        return matchedTags.length >= inTestTags.length;

    }

    static _validateTags(inTags, inFunctionName) {
        if (!(typeof inTags === "string" || Array.isArray(inTags))) throw new Error(`Tagger | ${inFunctionName} | inTags must be of type string or array`);

        const providedTags = typeof inTags === "string" ? inTags.split(",") : inTags;

        providedTags.forEach(t => {
            if (typeof t !== "string") throw new Error(`Tagger | ${inFunctionName} | tags in array must be of type string`);
        });

        return providedTags.map(t => t.trim());
    }

    static _validateObjects(inObjects, inFunctionName) {
        let relevantObjects = Array.isArray(inObjects) ? inObjects : [inObjects];
        relevantObjects.forEach(obj => {
            if (!obj) throw new Error(`Tagger | ${inFunctionName} | Invalid object provided`);
        })
        return relevantObjects.map(obj => obj?.document ?? obj);
    }
}

class TaggerConfig {

    static _handleRenderFormApplication(app, html) {
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
        if (document instanceof Actor) propertyName = "token." + propertyName;
        const tags = getProperty(updateData, propertyName);
        if (tags) setProperty(updateData, propertyName, Tagger._validateTags(tags, "_applyTags"));
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
