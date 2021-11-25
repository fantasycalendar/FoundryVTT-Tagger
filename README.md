# Tagger

This module allows you to tag PlaceableObjects and retrieve them just as easy.

## Download

`https://github.com/Haxxer/FoundryVTT-Tagger/releases/latest/download/module.json`

## Dialogs

All major PlaceableObjects' configuration dialogues (such as actor prototype tokens, tokens, tiles, walls, lights, etc), now has a "Tags" field.

Each tag is separated by a comma.

![img.png](docs/token-config.png)

## Documentation

### Get By Tag
Gets PlaceableObjects with matching tags provided to the method.

`Tagger.getByTag(String|Array, options={})`

```
@param    {String|Array}     inTags      An array of tags or a string of tags (separated by commas) that will be searched for
@param    {Object}           inOptions   An optional object that can contain any of the following:
                                             - matchAny {Boolean}        - whether the PlaceableObjects can contain any of the provided tags
                                             - matchExactly {Boolean}    - whether the tags on the PlaceableObjects must contain ONLY the tags provided
                                             - caseInsensitive {Boolean} - whether the search is case insensitive (capitals vs lowercase is not considered)
                                             - allScenes {Boolean}       - whether to search in all scenes, this will return an object with the key
                                                                           as the scene ID, and an array for objects found within that scene
                                             - returnObjects {Boolean}   - whether to return the object rather than the Document
                                             - objects {Array}           - an array of PlaceableObjects to test
                                             - ignore {Array}            - an array of PlaceableObjects to ignore
                                             - sceneId {String}          - a string ID for the scene to search in

@returns  {Array}                        Returns an array of filtered Documents based on the tags
```

Examples:

- `Tagger.getByTag("tags")`
- `Tagger.getByTag("tags, TO, LOOK, foR", { caseInsensitive: true })`
- `Tagger.getByTag(["tags", "to", "look", "for"], { matchAny: true, sceneId: "8xjy4UUVoRcEYUNy" })`

### Get Tags
Gets all tags from a given PlaceableObject

`Tagger.getTags(PlaceableObject)`

```
@param    {PlaceableObject}  inObject       The PlaceableObject get tags from

@returns  {Array}                           An array of tags from the PlaceableObject
```


### Has Tags
Checks if a PlaceableObject has the given tags

`Tagger.hasTags(PlaceableObject, String|Array, Object)`

```
@param    {PlaceableObject}  inObject       The PlaceableObject to check
@param    {String|Array}     inTags         An array of tags or a string of tags (separated by commas) that will be searched for
@param    {Object}           inOptions      An optional object that can contain any of the following:
                                             - matchAny {Boolean}        - whether the PlaceableObjects can contain any of the provided tags
                                             - matchExactly {Boolean}    - whether the tags on the PlaceableObjects must contain ONLY the tags provided
                                             - caseInsensitive {Boolean} - whether the search is case insensitive (capitals vs lowercase is not considered)

@returns  {Boolean}                         Returns a boolean whether the PlaceableObject's Document has the given tags
```

### Set Tags

Set the tags on a PlaceableObject

`Tagger.setTags(PlaceableObject|Array, String|Array)`

```
@param    {PlaceableObject|Array}    inObjects   A PlaceableObject or an array of PlaceableObjects to set tags on
@param    {String|Array}             inTags      An array of tags or a string of tags (separated by commas) that will override all tags on the PlaceableObjects

@returns  {Promise}                              A promise that will resolve when the PlaceableObjects' tags have been updated

```

### Add Tags

Add tags to a PlaceableObject

`Tagger.addTags(PlaceableObject|Array, String|Array)`

```
@param    {PlaceableObject|Array}    inObjects   A PlaceableObject or an array of PlaceableObjects to add tags to
@param    {String|Array}             inTags      An array of tags or a string of tags (separated by commas) that will be added to the PlaceableObjects

@returns  {Promise}                              A promise that will resolve when the PlaceableObjects' tags have been updated
```

### Remove Tags

Remove tags from a PlaceableObject

`Tagger.removeTags(PlaceableObject|Array, String|Array)`

```
@param    {PlaceableObject|Array}    inObjects   A PlaceableObject or an array of PlaceableObjects to remove tags from
@param    {String|Array}             inTags      An array of tags or a string of tags (separated by commas) that will be removed from the PlaceableObjects

@returns  {Promise}                              A promise that will resolve when the PlaceableObjects' tags have been updated
```

### Clear All Tags

Removes all tags from a PlaceableObject

`Tagger.clearAllTags(PlaceableObject|Array)`

```
@param    {PlaceableObject|Array}    inObjects   The PlaceableObjects to remove all tags from

@returns  {Promise}                              A promise that will resolve when the PlaceableObjects' tags have been updated
```
