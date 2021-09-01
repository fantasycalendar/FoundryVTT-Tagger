# Tagger

This module allows you to tag objects and retrieve them just as easy.

## Download

`https://github.com/Haxxer/FoundryVTT-Tagger/releases/latest/download/module.json`

## Dialogs

All major objects' configuration dialogues (such as tokens, tiles, walls, lights, etc), now has a "Tags" field. Each tag is separated by a comma.

![img.png](docs/token-config.png)

## Documentation

### Get By Tag
Gets objects with matching tags provided to the method.

`Tagger.getByTag(string|array, options={})`

```
@param 	{string|array}	inTags	 An array of tags or a string of tags (separated by commas)
                                 that will be searched for
                                 
@param 	{object} 	options	 An optional object that can contain any of the following:
                                    - matchAll {boolean}         - If true, the object must contain only
                                                                   the provided tags
                                    - caseInsensitive {boolean}	 - whether the search is case insensitive
                                    - objects {array} 	         - an array of objects to test
                                    - ignore {array}             - an array of objects to ignore
                                    - sceneId {string}	         - a string ID for the scene to search in
                                    
@returns {Promise}      A promise that will resolve when all objects have been found, returning an array
```

Examples:

- `Tagger.getByTag("tags")`
- `Tagger.getByTag("tags, TO, LOOK, foR", { caseInsensitive: true })`
- `Tagger.getByTag(["tags", "to", "look", "for"], { matchAll: true, sceneId: "8xjy4UUVoRcEYUNy" })`

### Get Tags
Gets all tags from a given object

`Tagger.getTags(object)`

```
@param	{object}        inObject        The object get tags from

@returns {array}                        The tags on the objects in an array
```

### Set Tags

Set the tags on an object

`Tagger.setTags(object|array, string|array)`

```
@param 	{object|array}	inObjects       An object or an array of objects to set tags on
@param 	{string|array} 	inTags          An array of tags or a string of tags (separated by commas) that will 
                                        override all tags on the objects

@returns {promise}                      A promise that will resolve when the objects' tags have been updated
```

### Add Tags

Adds tags to an object

`Tagger.addTags(object|array, string|array)`

```
@param 	{object|array}	inObjects       An object or an array of objects to add tags to
@param 	{string|array} 	inTags          An array of tags or a string of tags (separated by commas) that will
                                        be added to the objects

@returns {promise}                      A promise that will resolve when the objects' tags have been updated
```

### Remove Tags

Removes tags from an object

`Tagger.removeTags(object|array, string|array)`

```
@param 	{object|array}	inObjects       An object or an array of objects to remove tags from
@param 	{string|array} 	inTags          An array of tags or a string of tags (separated by commas) that will
                                        be removed from the objects

@returns {promise}                      A promise that will resolve when the objects' tags have been updated
```

### Clear All Tags

Removes all tags from an object

`Tagger.clearAllTags(object|array)`

```
@param 	{object|array}  inObjects       The objects to remove all tags from

@returns {promise}                      A promise that will resolve when the objects' tags have been updated
```
