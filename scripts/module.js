const MODULE_NAME = "tagger";
const FLAG_NAME = "tags";
const Tagger = {

    /**
     * Gets all tags from a given object
     *
     * @param    {object}          inObject    The object get tags from
     * @returns {array}                        The tags on the objects in an array
     */
    getTags(inObject) {
        if (inObject?.document) inObject = inObject.document;
        let tags = inObject?.getFlag(MODULE_NAME, FLAG_NAME) ?? [];
        return Tagger._validateTags(tags);
    },

    /**
     * Gets objects with matching tags provided to the method
     *
     * @param    {string|array}   inTags       An array of tags or a string of tags (separated by commas) that will be searched for
     * @param    {object}         options      An optional object that can contain any of the following:
     *                                              - matchAll {boolean} - whether the object must contain all of the provided tags
     *                                              - caseInsensitive     - whether the search is case insensitive (capitals vs lowercase is not considered)
     *                                              - objects {array}     - an array of objects to test
     *                                              - ignore {array}     - an array of objects to ignore
     *                                              - sceneId {string}     - a string ID for the scene to search in
     * @returns {Promise}                      A promise that will resolve when all objects have been found, returning an array of objects
     */
    getByTag(inTags, options = {}) {

        return new Promise(resolve => {

            options = foundry.utils.mergeObject({
                objects: [],
                ignore: [],
                matchAll: false,
                caseInsensitive: false,
                sceneId: game.canvas.id
            }, options)

            inTags = Tagger._validateTags(inTags, "getByTag")
                .map(t => options.caseInsensitive ? t.toLowerCase() : t)
                .map(t => new RegExp(t.replace(/[^A-Za-z0-9 .*_-]/g, "").replace(".", "\.").replace("*", "(.*?)")))

            if (!Array.isArray(options.objects)) throw new Error("Tagger | getByTag | options.objects must be of type array");
            if (!Array.isArray(options.ignore)) throw new Error("Tagger | getByTag | options.ignore must be of type array");
            if (typeof options.sceneId !== "string") throw new Error("Tagger | getByTag | options.sceneId must be of type string");
            let scene = game.scenes.get(options.sceneId);
            if (!scene) throw new Error(`Tagger | getByTag | could not find scene with id ${options.sceneId}`);

            if (!options.objects.length) {
                options.objects = Tagger._getObjectsFromScene(scene)
            }

            options.objects = options.objects.filter(o => !options.ignore.includes(o));

            resolve(options.objects.filter(obj => {
                let tags = Tagger.getTags(obj);
                return tags && Tagger._testTags(inTags, tags, options);
            }).map(obj => obj?._object ?? obj));

        });
    },

    _getObjectsFromScene(scene) {
        return [
            ...Array.from(scene.tokens),
            ...Array.from(scene.lights),
            ...Array.from(scene.sounds),
            ...Array.from(scene.templates),
            ...Array.from(scene.tiles),
            ...Array.from(scene.walls),
            ...Array.from(scene.drawings),
        ].deepFlatten().filter(Boolean)
    },

    _testTags(inTestTags, inTags, options) {

        inTags = inTags.map(tag => options.caseInsensitive ? tag.toLowerCase() : tag)

        let matches = inTestTags.filter(testTag => {
            return inTags.filter(tag => {
                return testTag.test(tag);
            }).length;
        })

        if (options.matchAll) {
            return matches.length === inTags.length;
        }

        return matches.length;
    },

    /**
     * Adds tags to an object
     *
     * @param    {object|array}    inObjects    An object or a list of objects to add tags to
     * @param    {string|array}    inTags       An array of tags or a string of tags (separated by commas) that will be added to the object
     * @returns {promise}                       A promise that will resolve when the object's tags have been updated
     */
    async addTags(inObjects, inTags) {
        inTags = Tagger._validateTags(inTags, "addTags");
        inObjects = Tagger._validateObjects(inObjects);
        return Tagger._updateTags(inObjects, inTags);
    },

    /**
     * Removes tags from an object
     *
     * @param    {object|array}    inObjects    An object or a list of objects to remove tags from
     * @param    {string|array}    inTags       An array of tags or a string of tags (separated by commas) that will be removed from the object
     * @returns {promise}                       A promise that will resolve when the object's tags have been updated
     */
    async removeTags(inObjects, inTags) {
        inTags = Tagger._validateTags(inTags, "removeTags");
        inObjects = Tagger._validateObjects(inObjects);
        return Tagger._updateTags(inObjects, inTags, false);
    },

    /**
     * Removes all tags from an object
     *
     * @param    {object|array}    inObjects    The object to remove all tags from
     * @returns {promise}                       A promise that will resolve when the object's tags have been updated
     */
    async clearAllTags(inObjects) {
        inObjects = Tagger._validateObjects(inObjects);
        return Tagger._updateTags(inObjects, false);
    },

    /**
     * Updates tags on the object
     *
     * @param    {object|array}    inObjects    The object to remove all tags from
     * @param    {array|boolean}   inTags       The tags to update the object with, or false if clearing all tags
     * @param    {boolean}         isAdding     The tags to update the object with, or false if clearing all tags
     * @returns {promise}                       A promise that will resolve when the object's tags have been updated
     */
    _updateTags(inObjects, inTags, isAdding = true) {
        return new Promise(async (resolve) => {
            for (let obj of inObjects) {
                if (inTags) {
                    let tags = Tagger.getTags(obj);
                    if (tags) tags = new Set(tags);

                    if (isAdding) {
                        tags = new Set([...tags, ...inTags]);
                    } else {
                        inTags.forEach(t => tags.delete(t));
                    }
                    if (tags.size === 0) {
                        await obj.unsetFlag(MODULE_NAME, FLAG_NAME);
                        continue;
                    }
                    await obj.setFlag(MODULE_NAME, FLAG_NAME, Array.from(tags));
                } else {
                    await obj.unsetFlag(MODULE_NAME, FLAG_NAME);
                }
            }
            resolve();
        })
    },

    _validateTags(inTags, functionName) {
        if (!(typeof inTags === "string" || Array.isArray(inTags))) throw new Error(`Tagger | ${functionName} | inTags must be of type string or array`);

        if (typeof inTags === "string") inTags = inTags.split(",");

        inTags.forEach(t => {
            if (typeof t !== "string") throw new Error(`Tagger | ${functionName} | tags in array must be of type string`);
        });

        inTags = inTags.map(t => t.trim());

        return inTags;
    },

    _validateObjects(inObjects) {
        if (!Array.isArray(inObjects)) inObjects = [inObjects];
        return inObjects.map(o => o?.document ?? o);
    },

    _applyHtml(app, elem, insertBefore = false) {
        if (!elem) return;
        let obj = app?.object._object;
        if (!obj) return;
        let tags = Tagger.getTags(obj)
        let html = `<fieldset style="margin: 3px 0;">
			<legend>Tags</legend>
			<div class="form-group">
				<input name="flags.${MODULE_NAME}.${FLAG_NAME}" type="text" value="${tags.join(', ')}">
			</div>
		</fieldset>
		`;
        if (insertBefore) {
            $(html).insertBefore(elem);
        } else {
            elem.append(html);
        }
        app.setPosition({ height: "auto" });
    },

    _handleTokenConfig(app, html) {
        let elem = html.find(`div[data-tab="character"]`);
        Tagger._applyHtml(app, elem);
    },

    _handleTileConfig(app, html) {
        let elem = html.find(`div[data-tab="basic"]`);
        Tagger._applyHtml(app, elem);
    },

    _handleDrawingConfig(app, html) {
        let elem = html.find(`div[data-tab="position"]`);
        Tagger._applyHtml(app, elem);
    },

    _handleGenericConfig(app, html) {
        let elem = html.find(`button[name="submit"]`);
        Tagger._applyHtml(app, elem, true);
    },

    _fixUpTags(app) {
        let obj = app?.object._object;
        if (!obj) return;
        [obj] = Tagger._validateObjects(obj);
        let tags = Tagger.getTags(obj);
        if (!tags.length) {
            obj.unsetFlag(MODULE_NAME, FLAG_NAME);
        } else {
            obj.setFlag(MODULE_NAME, FLAG_NAME, tags);
        }
    }

}

const configHandler = [
    { config: TokenConfig, method: Tagger._handleTokenConfig },
    { config: TileConfig, method: Tagger._handleTileConfig },
    { config: DrawingConfig, method: Tagger._handleDrawingConfig },
    { config: WallConfig, method: Tagger._handleGenericConfig },
    { config: LightConfig, method: Tagger._handleGenericConfig },
    { config: AmbientSoundConfig, method: Tagger._handleGenericConfig },
    { config: MeasuredTemplateConfig, method: Tagger._handleGenericConfig },
    { config: NoteConfig, method: Tagger._handleGenericConfig }
]

Hooks.once('ready', async function () {
    window.Tagger = Tagger;
});

Hooks.on("renderFormApplication", (app, html, options) => {
    if (!app) return;
    let found = configHandler.find(t => app instanceof t.config);
    if (!found) return;
    found.method(app, html, true);
})

Hooks.on("closeFormApplication", (app, html, options) => {
    if (!app) return;
    let found = configHandler.find(t => app instanceof t.config);
    if (!found) return;
    Tagger._fixUpTags(app)
})
