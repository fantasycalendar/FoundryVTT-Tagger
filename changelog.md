## Changelog

# Version 1.5.0
- Added Foundry VTT v14 support
- Added integration with the new v14 Placeables sidebar tab: tag pills are shown on each entry, and a `tag:foo` search prefix filters entries by tag. Multiple `tag:` terms must all match, use `tag:"two words"` for tags containing spaces, and `tag:foo*` for wildcard matching.
- Added pill colors to show how each tag relates to the current search: green when the tag matches a search term exactly, amber when it only matches because the sidebar ignores case or allows substrings (so `Tagger.getByTag(term)` with default options would not return it), and gray for tags that do not match any active search term. Hover any pill for details.
- Fixed RegionConfig integration in v14 (the `identity` tab was renamed to `appearance`)

Support Fantasy Computerworks by subscribing to our [patreon](<https://www.patreon.com/cw/fantasycomputerworks>) or supporting us on [ko-fi](<https://ko-fi.com/fantasycomputerworks>)!