# Tagger

![Latest Release Download Count](https://img.shields.io/github/downloads/Haxxer/FoundryVTT-Tagger/latest/module.zip?color=2b82fc&label=DOWNLOADS&style=for-the-badge) [![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fitem-piles&colorB=006400&style=for-the-badge)](https://forge-vtt.com/bazaar#package=item-piles) ![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fgithub.com%2FHaxxer%2FFoundryVTT-Tagger%2Freleases%2Flatest%2Fdownload%2Fmodule.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=orange&style=for-the-badge) ![Latest Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fgithub.com%2FHaxxer%2FFoundryVTT-Tagger%2Freleases%2Flatest%2Fdownload%2Fmodule.json&label=Latest%20Release&prefix=v&query=$.version&colorB=red&style=for-the-badge)

---

This module allows you to tag PlaceableObjects and retrieve them just as easy.

## Download

`https://github.com/fantasycalendar/FoundryVTT-Tagger/releases/latest/download/module.json`

## Dialogs

All major PlaceableObjects' configuration dialogues (such as actor prototype tokens, tokens, tiles, walls, lights, etc), now has a "Tags" field.

Each tag is separated by a comma.

![img.png](docs/token-config.png)

## Documentation

### Get By Tag
Get Documents with matching tags provided to the method.

`Tagger.getByTag(String|Array, Object)`

```
@param    {String|Array}     inTags      An array of tags or a string of tags (separated by commas) that will be searched for
@param    {Object}           inOptions   An optional object that can contain any of the following:
                                             - matchAny {Boolean}        - whether the Documents can contain any of the provided tags
                                             - matchExactly {Boolean}    - whether the tags on the PlaceableObjects must contain ONLY the tags provided
                                             - caseInsensitive {Boolean} - whether the search is case insensitive (capitals vs lowercase is not considered)
                                             - allScenes {Boolean}       - whether to search in all scenes, this will return an object with the key
                                                                           as the scene itself, and an array for objects found within that scene
                                             - objects {Array}           - an array of PlaceableObjects or Documents to test
                                             - ignore {Array}            - an array of PlaceableObjects or Documents to ignore
                                             - sceneId {String}          - a string ID for the scene to search in

@returns  {Array}                        Returns an array of filtered Documents based on the tags
```

Examples:

- `Tagger.getByTag("tags")`
- `Tagger.getByTag("tags, TO, LOOK, foR", { caseInsensitive: true })`
- `Tagger.getByTag(["tags", "to", "look", "for"], { matchAny: true, sceneId: "8xjy4UUVoRcEYUNy" })`

### Get Tags
Get all tags from a given Document

`Tagger.getTags(PlaceableObject|Documents)`

```
@param    {PlaceableObject|Document}  inObject      The PlaceableObject or Document get tags from

@returns  {Array}                                   An array of tags from the PlaceableObject or Document
```


### Has Tags
Checks if a PlaceableObject or Document has the given tags

`Tagger.hasTags(PlaceableObject|Document, String|Array, Object)`

```
@param    {PlaceableObject|Document}    inObject       The PlaceableObject or Document to check
@param    {String|Array}                inTags         An array of tags or a string of tags (separated by commas) that will be searched for
@param    {Object}                      inOptions      An optional object that can contain any of the following:
                                             - matchAny {Boolean}        - whether the Documents can contain any of the provided tags
                                             - matchExactly {Boolean}    - whether the tags on the Documents must contain ONLY the tags provided
                                             - caseInsensitive {Boolean} - whether the search is case insensitive (capitals vs lowercase is not considered)

@returns  {Boolean}                         Returns a boolean whether the Document has the given tags
```

### Set Tags

Set the tags on a PlaceableObject or Document

`Tagger.setTags(PlaceableObject|Document|Array, String|Array)`

```
@param    {PlaceableObject|Document|Array}  inObjects   PlaceableObjects or Documents to set tags on (array, or a single of either)
@param    {String|Array}                    inTags      An array of tags or a string of tags (separated by commas) that will override all tags on the Documents

@returns  {Promise}                                     A promise that will resolve when the Documents' tags have been updated
```

### Add Tags

Add tags to a PlaceableObject or Document

`Tagger.addTags(PlaceableObject|Document|Array, String|Array)`

```
@param    {PlaceableObject|Document|Array}  inObjects   PlaceableObjects or Documents to add tags on (array, or a single of either)
@param    {String|Array}                    inTags      An array of tags or a string of tags (separated by commas) that will be added to the Documents

@returns  {Promise}                                     A promise that will resolve when the Documents' tags have been updated
```

### Remove Tags

Remove tags from a PlaceableObject or Document

`Tagger.removeTags(PlaceableObject|Document|Array, String|Array)`

```
@param    {PlaceableObject|Document|Array}  inObjects   PlaceableObjects or Documents to remove tags from (array, or a single of either)
@param    {String|Array}                    inTags      An array of tags or a string of tags (separated by commas) that will be removed to the Documents

@returns  {Promise}                                     A promise that will resolve when the Documents' tags have been updated
```

### Clear All Tags

Removes all tags from a PlaceableObject or Document

`Tagger.clearAllTags(PlaceableObject|Document|Array)`

```
@param    {PlaceableObject|Document|Array}  inObjects   PlaceableObjects or Documents to remove all tags from (array, or a single of either)

@returns  {Promise}                                     A promise that will resolve when the Documents' tags have been updated
```
