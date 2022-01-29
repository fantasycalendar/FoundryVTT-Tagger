# Documentation
## Functions

<dl>
<dt><a href="#getByTag">Tagger.getByTag(inTags, inOptions)</a> ⇒ <code>Array</code></dt>
<dd><p>Gets PlaceableObjects with matching tags provided to the method</p>
</dd>
<dt><a href="#hasTags">Tagger.hasTags(inObject, inTags, inOptions)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Verifies whether a given PlaceableObject or Document has the tags given</p>
</dd>
<dt><a href="#getTags">Tagger.getTags(inObject)</a> ⇒ <code>Array</code></dt>
<dd><p>Gets all tags from a given PlaceableObject or Document</p>
</dd>
<dt><a href="#setTags">Tagger.setTags(inObjects, inTags)</a> ⇒ <code>Promise</code></dt>
<dd><p>Set the tags on an PlaceableObject or Document, completely overwriting existing tags on the object</p>
</dd>
<dt><a href="#toggleTags">Tagger.toggleTags(inObjects, inTags)</a> ⇒ <code>Promise</code></dt>
<dd><p>Toggles the tags on an PlaceableObject or Document. If a tag is present, it will be removed. If it not present, it will be added.</p>
</dd>
<dt><a href="#addTags">Tagger.addTags(inObjects, inTags)</a> ⇒ <code>Promise</code></dt>
<dd><p>Adds tags to an object</p>
</dd>
<dt><a href="#removeTags">Tagger.removeTags(inObjects, inTags)</a> ⇒ <code>Promise</code></dt>
<dd><p>Removes tags from an object</p>
</dd>
<dt><a href="#clearAllTags">Tagger.clearAllTags(inObjects)</a> ⇒ <code>Promise</code></dt>
<dd><p>Removes all tags from PlaceableObjects</p>
</dd>
<dt><a href="#applyTagRules">Tagger.applyTagRules(inObjects)</a> ⇒ <code>Promise</code></dt>
<dd><p>Applies all tag rules to every tag found on the given PlaceableObjects</p>
</dd>
<dt><a href="#tagRules">Tag Rules</a></dt>
<dd><p>Tag rules that are applied on object creation.</p>
</dd>
</dl>



<a name="getByTag"></a>

## Tagger.getByTag(inTags, inOptions) ⇒ <code>Array</code>

Examples:
```js
// Find objects whose tags contain "tag_to_find"
const objects = Tagger.getByTag("tag_to_find");

// Find objects with JUST and ONLY the tag "tag_to_find"
const objects = Tagger.getByTag("tag_to_find", { matchExactly: true });
```

Gets PlaceableObjects with matching tags provided to the method

**Returns**: <code>Array</code> - Returns an array of filtered Documents based on the tags

| Param | Type | Description |
| --- | --- | --- |
| inTags | <code>String/RegExp/Array.&lt;String/RegExp&gt;</code> | An array of tags or a string of tags (separated by commas) that will be searched for |
| inOptions | <code>Object</code> | An optional object that can contain any of the following:                                              <br>- matchAny {Boolean}        - whether the PlaceableObjects can contain any of the provided tags                                              <br>- matchExactly {Boolean}    - whether the tags on the PlaceableObjects must contain ONLY the tags provided                                              <br>- caseInsensitive {Boolean} - whether the search is case insensitive (capitals vs lowercase is not considered)                                              <br>- allScenes {Boolean}       - whether to search in all scenes, this will return an object with the key                                                                            as the scene ID, and an array for objects found within that scene                                              <br>- objects {Array}           - an array of PlaceableObjects to test                                              <br>- ignore {Array}            - an array of PlaceableObjects to ignore                                              <br>- sceneId {String}          - a string ID for the scene to search in |

<a name="hasTags"></a>

## Tagger.hasTags(inObject, inTags, inOptions) ⇒ <code>Boolean</code>

Examples:
```js
// Whether the selected token has the tag "tag_to_find"
const objects = Tagger.hasTags(token, "tag_to_find");

// Whether the token has a tag that resembles "tag_to_find" or "TAG_TO_FIND" or "tAg_To_FiNd"
const objects = Tagger.hasTags(token, "TAG_to_FIND", { caseInsensitive: true });
```

Verifies whether a given PlaceableObject or Document has the tags given

**Returns**: <code>Boolean</code> - Returns a boolean whether the object has the given tags

| Param | Type | Description |
| --- | --- | --- |
| inObject | <code>PlaceableObject</code> | A PlaceableObject, or an array of PlaceableObjects to check for tags on |
| inTags | <code>String/Array</code> | An array of tags or a string of tags (separated by commas) that will be searched for |
| inOptions | <code>Object</code> | An optional object that can contain any of the following:                                              <br>- matchAny {Boolean}        - whether the PlaceableObjects can contain any of the provided tags                                              <br>- matchExactly {Boolean}    - whether the tags on the PlaceableObjects must contain ONLY the tags provided                                              <br>- caseInsensitive {Boolean} - whether the search is case insensitive (capitals vs lowercase is not considered) |

<a name="getTags"></a>

## Tagger.getTags(inObject) ⇒ <code>Array</code>

Examples:
```js
// If the token has several tags, this method will return all of those tags as an array
const tags = Tagger.getTags(token);
```

Gets all tags from a given PlaceableObject or Document

**Returns**: <code>Array</code> - An array of tags from the Document

| Param | Type | Description |
| --- | --- | --- |
| inObject | <code>PlaceableObject</code> | The PlaceableObject or Document get tags from |

<a name="setTags"></a>

## Tagger.setTags(inObjects, inTags) ⇒ <code>Promise</code>
Examples:
```js
// Sets the tags on the token to be ONLY "tag_to_set"
await Tagger.setTags(token, "tag_to_set");

// You can also set multiple tags with an array
await Tagger.setTags(token, ["tag_to_set", "tag_to_also_set"]);

// Or as a string with each tag separated with a comma
await Tagger.setTags(token, "tag_to_set, tag_to_also_set");
```

Set the tags on an PlaceableObject or Document, **completely overwriting existing tags on the object**

**Returns**: <code>Promise</code> - A promise that will resolve when the PlaceableObjects' tags have been updated

| Param | Type | Description |
| --- | --- | --- |
| inObjects | <code>PlaceableObject/Array</code> | A PlaceableObject, or an array of PlaceableObjects to set tags on |
| inTags | <code>String/Array</code> | An array of tags or a string of tags (separated by commas) that will override all tags on the PlaceableObjects |

<a name="toggleTags"></a>

## Tagger.toggleTags(inObjects, inTags) ⇒ <code>Promise</code>
Examples:
```js
// If the token had the tag "tag_to_toggle", it no longer has it
await Tagger.toggleTags(token, "tag_to_toggle");

// You can also toggle multiple tags with an array
await Tagger.toggleTags(token, ["tag_to_toggle", "tag_to_also_toggle"]);

// Or as a string with each tag separated with a comma
await Tagger.toggleTags(token, "tag_to_toggle, tag_to_also_toggle");
```

Toggles the tags on an PlaceableObject or Document. If a tag is present, it will be removed. If it not present, it will be added.

**Returns**: <code>Promise</code> - A promise that will resolve when the PlaceableObjects' tags have been updated

| Param | Type | Description |
| --- | --- | --- |
| inObjects | <code>PlaceableObject/Array</code> | A PlaceableObject, or an array of PlaceableObjects to set tags on |
| inTags | <code>String/Array</code> | An array of tags or a string of tags (separated by commas) that will override all tags on the PlaceableObjects |

<a name="addTags"></a>

## Tagger.addTags(inObjects, inTags) ⇒ <code>Promise</code>
Example:
```js
// Adds "tag_to_add" to the token's existing tags
await Tagger.addTags(token, "tag_to_add");
```

Adds tags to an object

**Returns**: <code>Promise</code> - A promise that will resolve when the PlaceableObjects' tags have been updated

| Param | Type | Description |
| --- | --- | --- |
| inObjects | <code>PlaceableObject/Array</code> | A PlaceableObject, or an array of PlaceableObjects to add tags to |
| inTags | <code>String/Array</code> | An array of tags or a string of tags (separated by commas) that will be added to the PlaceableObjects |

<a name="removeTags"></a>

## Tagger.removeTags(inObjects, inTags) ⇒ <code>Promise</code>
Example:
```js
// Removes "tag_to_remove" from the token's tags
await Tagger.removeTags(token, "tag_to_remove");
```

Removes tags from an object

**Returns**: <code>Promise</code> - A promise that will resolve when the PlaceableObjects' tags have been updated

| Param | Type | Description |
| --- | --- | --- |
| inObjects | <code>PlaceableObject/Array</code> | A PlaceableObject, or an array of PlaceableObjects to remove tags from |
| inTags | <code>String/Array</code> | An array of tags or a string of tags (separated by commas) that will be removed from the PlaceableObjects |

<a name="clearAllTags"></a>

## Tagger.clearAllTags(inObjects) ⇒ <code>Promise</code>
Example:
```js
// Clears all tags from the given object
await Tagger.clearAllTags(token);
```

Removes all tags from PlaceableObjects

**Returns**: <code>Promise</code> - A promise that will resolve when the PlaceableObjects' tags have been updated

| Param | Type | Description |
| --- | --- | --- |
| inObjects | <code>PlaceableObject/Array</code> | The PlaceableObjects to remove all tags from |

<a name="applyTagRules"></a>

## Tagger.applyTagRules(inObjects) ⇒ <code>Promise</code>
Example:
```js
// If the token has a tag that looks like this: "test_{#}_tag", running this method:
await Tagger.applyTagRules(token);
// The tag will now be "test_1_tag", but the number depends on how many other objects in the scene that also has that same tag
```

Applies all tag rules to every tag found on the given PlaceableObjects

**Returns**: <code>Promise</code> - A promise that will resolve when the PlaceableObjects' tags have been updated

| Param | Type | Description |
| --- | --- | --- |
| inObjects | <code>PlaceableObject/Array</code> | The PlaceableObjects to apply tag rules to |

<a name="tagRules"></a>

## Tag Rules

| Tag Rule | Description | Example |
| -------- | ------ | ----------- |
| `{#}` | The `{#}` gets replaced with an unique number, and the number depends on how many other objects in the scene also has that tag | `test_{#}_tag` becomes `test_1_tag` |
| `{id}` | The `{id}` gets replaced with an unique ID | `test_{id}_tag` becomes `test_3vpqbezsece9zdwi_tag` |