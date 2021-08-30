# Global Tags

This module allows you to tag objects and retrieve them just as easy.

### Download

`https://github.com/Haxxer/FoundryVTT-GlobalTags/releases/latest/download/module.json`

### Get By Tag

Get all objects on the canvas with specific tags with:
```js
GlobalTags.getByTag(string|array)
```

### Add Tags
Tag objects with:
```js
GlobalTags.addTags(object|array, string|array)
```

### Remove Tags
Remove tags from objects with:
```js
GlobalTags.removeTags(object|array, string|array)
```

### Clear All Tags
Remove _all_ tags from objects with:
```js
GlobalTags.clearAllTags(object|array)
```

### Get Tags

Get all tags from an object with:
```js
GlobalTags.getTags(object)
```
