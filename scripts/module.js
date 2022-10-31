import { hotkeyState, registerHotkeysPost, registerHotkeysPre } from "./hotkeys.js";
import CONSTANTS from "./constants.js";

export default class Tagger {
  
  /**
   * Gets PlaceableObjects with matching tags provided to the method
   *
   * @param    {String/RegExp/Array<String/RegExp>}     inTags      An array of tags or a string of tags (separated by commas) that will be searched for
   * @param    {Object}           inOptions   An optional object that can contain any of the following:
   *                                              <br>- matchAny {Boolean}        - whether the PlaceableObjects can contain any of the provided tags
   *                                              <br>- matchExactly {Boolean}    - whether the tags on the PlaceableObjects must contain ONLY the tags provided
   *                                              <br>- caseInsensitive {Boolean} - whether the search is case insensitive (capitals vs lowercase is not considered)
   *                                              <br>- allScenes {Boolean}       - whether to search in all scenes, this will return an object with the key
   *                                                                            as the scene ID, and an array for objects found within that scene
   *                                              <br>- objects {Array}           - an array of PlaceableObjects to test
   *                                              <br>- ignore {Array}            - an array of PlaceableObjects to ignore
   *                                              <br>- sceneId {String}          - a string ID for the scene to search in
   *
   * @returns  {Array}                        Returns an array of filtered Documents based on the tags
   */
  static getByTag(inTags, inOptions = {}) {
    return Tagger._getObjectsByTags(inTags, inOptions, "getByTag");
  }
  
  /**
   * Verifies whether a given PlaceableObject or Document has the tags given
   *
   * @param    {PlaceableObject}    inObjects   A PlaceableObject, or an array of PlaceableObjects to check for tags on
   * @param    {String/Array}       inTags      An array of tags or a string of tags (separated by commas) that will be searched for
   * @param    {Object}             inOptions   An optional object that can contain any of the following:
   *                                              <br>- matchAny {Boolean}        - whether the PlaceableObjects can contain any of the provided tags
   *                                              <br>- matchExactly {Boolean}    - whether the tags on the PlaceableObjects must contain ONLY the tags provided
   *                                              <br>- caseInsensitive {Boolean} - whether the search is case insensitive (capitals vs lowercase is not considered)
   *
   * @returns  {Boolean}                        Returns a boolean whether the object has the given tags
   */
  static hasTags(inObjects, inTags, inOptions = {}) {
    const relevantObjects = this._validateObjects(inObjects, "setTags");
    return Tagger._getObjectsByTags(inTags, foundry.utils.mergeObject(inOptions, { objects: relevantObjects }), "hasTags").length > 0;
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
    const tags = relevantDocument?.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.TAGS) ?? [];
    return this._validateTags(tags, "getTags");
  }
  
  /**
   * Set the tags on an PlaceableObject or Document, completely overwriting existing tags on the object
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
   * @param    {PlaceableObject/Array}    inObjects   A PlaceableObject, or an array of PlaceableObjects to set tags on
   * @param    {String/Array}             inTags      An array of tags or a string of tags (separated by commas) that will override all tags on the PlaceableObjects
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
      .map(t => t instanceof RegExp ? t : new RegExp(t.replaceAll(".", "\.").replaceAll("*", "(.*?)")));
    
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
    
    return providedTags.map(t => t instanceof RegExp ? t : t.trim());
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

class TaggerConfig {
  
  static _handleRenderFormApplication(app, html) {
    let method = configHandlers[app.constructor.name];
    if (!method) {
      const key = Object.keys(configHandlers).find(name => app.constructor.name.includes(name));
      if (!key) return;
      method = configHandlers[key];
    }
    TaggerConfig[method](app, html, true);
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
  
  static _handleAmbientLightConfig(app, html) {
    let button = html.find(`button[name="submit"]`);
    let elem = (button.length ? button : html.find(`button[type="submit"]`)).parent();
    this._applyHtml(app, elem, true);
  }
  
  static _handleGenericConfig(app, html) {
    let button = html.find(`button[name="submit"]`);
    let elem = (button.length ? button : html.find(`button[type="submit"]`));
    this._applyHtml(app, elem, true);
  }
  
  static _applyHtml(app, elem, insertBefore = false) {
    if (!elem) return;

    const tags = Tagger.getTags(app?.object?._object ?? app?.object);
    
    const html = $(`
        <fieldset style="margin: 3px 0;">
			<legend>Tags (separated by commas)</legend>
			<div class="form-group">
				<input name="${CONSTANTS.TAG_PROPERTY}" type="text" value="${tags.join(', ')}">
				<button type="button" style="flex: 0; height: 28px; width: 28px; line-height: 0; font-size: 0.75rem; margin-left: 10px;"><i class="fas fa-check"></i></button>
			</div>
		</fieldset>`);
    
    html.find('button').click(function () {
      const tags = Tagger._validateTags(html.find('input').val());
      html.find('input').val(TaggerHandler.applyRules(tags).join(", "));
    });
    
    if (insertBefore) {
      html.insertBefore(elem);
    } else {
      elem.append(html);
    }
    app.setPosition({ height: "auto" });
  }
}

const configHandlers = {
  "TokenConfig": "_handleTokenConfig",
  "TileConfig": "_handleTileConfig",
  "DrawingConfig": "_handleDrawingConfig",
  "AmbientLightConfig": "_handleAmbientLightConfig", // v9
  "LightConfig": "_handleGenericConfig", // v8
  "WallConfig": "_handleGenericConfig",
  "AmbientSoundConfig": "_handleGenericConfig",
  "MeasuredTemplateConfig": "_handleGenericConfig",
  "NoteConfig": "_handleGenericConfig"
}

Hooks.on("renderFormApplication", TaggerConfig._handleRenderFormApplication);

let temporaryIds = {};

class TaggerHandler {
  
  static applyUpdateTags(inDocument, updateData) {
    let propertyName = CONSTANTS.TAG_PROPERTY;
    if (inDocument instanceof Actor) propertyName = "token." + propertyName;
    let tags = getProperty(updateData, propertyName);
    if (!tags || tags?.length === 0) return;
    tags = Tagger._validateTags(tags, "_applyTags");
    setProperty(updateData, propertyName, tags);
  }
  
  static preCreateApplyTags(inDocument, documentData) {
    if (hotkeyState.dropNoRules) return;
    temporaryIds = {};
    this.applyCreateTags(documentData);
    temporaryIds = {};
    return inDocument?.updateSource ? inDocument.updateSource(documentData) : inDocument.data.update(documentData);
  }
  
  static applyCreateTags(documentData) {
    
    const preprocessed = getProperty(documentData, `${CONSTANTS.DATA_PROPERTY}.preprocessed`);
    if (preprocessed) {
      setProperty(documentData, `${CONSTANTS.DATA_PROPERTY}.preprocessed`, false);
      return;
    }
    
    let tags = getProperty(documentData, CONSTANTS.TAG_PROPERTY);
    
    if (tags) {
      tags = this.applyRules(tags);
      setProperty(documentData, CONSTANTS.TAG_PROPERTY, tags);
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
          let locationName = getProperty(action?.data, nameProperty);
          if (locationName && locationName.startsWith("[Tagger] ")) {
            const tags = locationName.replace("[Tagger] ", "");
            const newTags = this.applyRules(tags).join(", ");
            setProperty(documentData, `flags.monks-active-tiles.actions.${i}.data.` + nameProperty, `[Tagger] ${newTags}`);
          }
        }
        
        for (const idProperty of ids) {
          let locationId = getProperty(action?.data, idProperty);
          if (locationId && locationId.startsWith("tagger:")) {
            const tags = locationId.replace("tagger:", "");
            const newTags = this.applyRules(tags).join(", ");
            setProperty(documentData, `flags.monks-active-tiles.actions.${i}.data.` + idProperty, `tagger:${newTags}`);
          }
        }
      });
  
      let monkEntity = documentData?.flags?.["monks-active-tiles"]?.entity;
      if(monkEntity) {
        let reparse = false;
        if (typeof monkEntity === "string") {
          monkEntity = JSON.parse(monkEntity);
          setProperty(documentData, `flags.monks-active-tiles.entity`, monkEntity);
          reparse = true;
        }
        let entityId = getProperty(monkEntity, "id");
        if (entityId && entityId.startsWith("tagger:")) {
          const tags = entityId.replace("tagger:", "");
          const newTags = this.applyRules(tags).join(", ");
          setProperty(documentData, `flags.monks-active-tiles.entity.id`, `tagger:${newTags}`);
        }
        if(reparse){
          setProperty(documentData, `flags.monks-active-tiles.entity`, JSON.stringify(monkEntity));
        }
      }
      
    }
    
  }
  
  static recurseTokenAttacher(documentData) {
    const prototypeAttached = getProperty(documentData, "flags.token-attacher.prototypeAttached");
    if (prototypeAttached) {
      for (const objects of Object.values(prototypeAttached)) {
        for (const object of objects) {
          this.applyCreateTags(object)
          setProperty(object, `${CONSTANTS.DATA_PROPERTY}.preprocessed`, true);
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
        id = randomID();
        temporaryIds[tag].push(id);
      }
      return tag.replace(regx, id);
    }
  }
}

Hooks.on("preUpdateActor", (...args) => TaggerHandler.applyUpdateTags(...args));
Hooks.on("preUpdateToken", (...args) => TaggerHandler.applyUpdateTags(...args));
Hooks.on("preUpdateTile", (...args) => TaggerHandler.applyUpdateTags(...args));
Hooks.on("preUpdateDrawing", (...args) => TaggerHandler.applyUpdateTags(...args));
Hooks.on("preUpdateWall", (...args) => TaggerHandler.applyUpdateTags(...args));
Hooks.on("preUpdateLight", (...args) => TaggerHandler.applyUpdateTags(...args)); // 0.8.9
Hooks.on("preUpdateAmbientLight", (...args) => TaggerHandler.applyUpdateTags(...args));
Hooks.on("preUpdateAmbientSound", (...args) => TaggerHandler.applyUpdateTags(...args));
Hooks.on("preUpdateMeasuredTemplate", (...args) => TaggerHandler.applyUpdateTags(...args));
Hooks.on("preUpdateNote", (...args) => TaggerHandler.applyUpdateTags(...args));

Hooks.on("preCreateToken", (...args) => TaggerHandler.preCreateApplyTags(...args));
Hooks.on("preCreateTile", (...args) => TaggerHandler.preCreateApplyTags(...args));
Hooks.on("preCreateDrawing", (...args) => TaggerHandler.preCreateApplyTags(...args));
Hooks.on("preCreateWall", (...args) => TaggerHandler.preCreateApplyTags(...args));
Hooks.on("preCreateLight", (...args) => TaggerHandler.preCreateApplyTags(...args)); // 0.8.9
Hooks.on("preCreateAmbientLight", (...args) => TaggerHandler.preCreateApplyTags(...args));
Hooks.on("preCreateAmbientSound", (...args) => TaggerHandler.preCreateApplyTags(...args));
Hooks.on("preCreateMeasuredTemplate", (...args) => TaggerHandler.preCreateApplyTags(...args));
Hooks.on("preCreateNote", (...args) => TaggerHandler.preCreateApplyTags(...args));

Hooks.once('init', async function () {
  registerHotkeysPre();
})

Hooks.once('ready', async function () {
  registerHotkeysPost();
  window.Tagger = Tagger;
});
