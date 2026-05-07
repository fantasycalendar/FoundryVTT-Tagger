import Tagger from "./tagger.js";
import CONSTANTS from "./constants.js";

// String key so the marker survives module re-evaluation.
const PATCHED = "__taggerPlaceableTabPatched";
// Instance-level stash for parsed tag terms, set by the _applyFilters wrapper
// and read by the _matchesFilter wrappers within the same synchronous call.
const TAG_TERMS = "__taggerTagTerms";

/**
 * Parse a raw search query into a name-search string and a list of tag terms.
 *
 * Terms of the form `tag:foo` (and `tag:"foo bar"` for multi-word) are extracted as tag filters.
 * Empty forms (`tag:` alone, or `tag:""`) are stripped from the name query so they don't get
 * matched literally against entry names; they yield no tag terms.
 *
 * @param {string} rawQuery
 * @returns {{ nameQuery: string, tagTerms: string[] }}
 */
export function parseSidebarQuery(rawQuery) {
    if (!rawQuery) return { nameQuery: "", tagTerms: [] };
    const tagTerms = [];
    const termRe = /tag:(?:"([^"]+)"|(\S+))/gi;
    let nameQuery = rawQuery.replace(termRe, (_, quoted, bare) => {
        const term = (quoted ?? bare ?? "").trim();
        if (term) tagTerms.push(term);
        return "";
    });
    // Strip empty tag forms that the term regex didn't capture: `tag:""` and a bare
    // `tag:` followed by whitespace or end-of-string.  Without this they leak into
    // the name search and cause "no entries match".
    nameQuery = nameQuery.replace(/tag:""/gi, "").replace(/tag:(?=\s|$)/gi, "").trim();
    return { nameQuery, tagTerms };
}

/**
 * Test whether a single tag matches a single search term under sidebar-lenient rules.
 *
 * Rules: case-insensitive throughout.  If the term contains `*`, treat it as an API-style
 * wildcard pattern (anchored, `*` -> `(.*?)`).  Otherwise substring-match.  This way
 * `tag:foo` is forgiving (typeahead-friendly) and `tag:foo*` is precise (mirrors the API).
 *
 * @param {string} term   The user-entered search term (unlowered).
 * @param {string} tag    The stored tag value (unlowered).
 * @returns {boolean}
 */
function termMatchesTagLeniently(term, tag) {
    const t = term.toLowerCase();
    const tagLower = tag.toLowerCase();
    if (term.includes("*")) {
        return new RegExp(`^${t.split("*").map(p => RegExp.escape(p)).join("(.*?)")}$`).test(tagLower);
    }
    return tagLower.includes(t);
}

/**
 * Test whether a document's tags match every tag term under sidebar-lenient rules.
 * Multiple terms are AND-combined to match the rest of Foundry's filter UX.
 *
 * @param {foundry.abstract.Document} entry
 * @param {string[]} tagTerms
 * @returns {boolean}
 */
export function entryMatchesTagTerms(entry, tagTerms) {
    if (!tagTerms.length) return true;
    const tags = Tagger.getTags(entry) ?? [];
    return tagTerms.every(term => tags.some(tag => termMatchesTagLeniently(term, String(tag))));
}

/**
 * Build the regex Tagger.getByTag would use for a search term under default options.
 *
 * Mirrors module.js:226-229: anchored exact match, with `*` expanded to `(.*?)`.
 * All other regex metacharacters are escaped so the comparison stays string-literal
 * everywhere except wildcards.  Case-sensitive, matching the API default.
 *
 * @param {string} term
 * @returns {RegExp}
 */
function buildApiRegex(term) {
    // Split on `*`, escape each chunk, then rejoin with `(.*?)` to match the API's
    // wildcard expansion.  Doing it in this order means the escape pass can't accidentally
    // mangle the wildcard syntax.
    const parts = term.split("*").map(p => RegExp.escape(p));
    return new RegExp(`^${parts.join("(.*?)")}$`);
}

/**
 * Decide whether a (term, tag) pair is an "exact" API match: whether
 * `Tagger.getByTag(term)` with default options would accept this tag.
 *
 * Returns false when the sidebar's lenient match would still surface the tag (substring
 * or case-insensitive) but the API wouldn't.  Used to drive the partial-match indicator.
 *
 * @param {string} term  The user-entered search term (unlowered).
 * @param {string} tag   The tag value as stored on the document (unlowered).
 * @returns {boolean}
 */
export function termMatchesTagExactly(term, tag) {
    return buildApiRegex(term).test(tag);
}

/**
 * Classify a single tag against the active query terms into one of three states.
 *
 * Returns:
 *   - "matched"   : at least one term exactly matches this tag (API would return it).
 *   - "partial"   : at least one term leniently matches but none exactly (sidebar shows
 *                   the row, but Tagger.getByTag(term) would skip this tag with default options).
 *   - "unmatched" : no term matches this tag at all.  The row is still visible because some
 *                   *other* tag on the same entry matched; this pill is just along for the ride.
 *
 * Callers should only invoke this when there are active terms.  With no terms the caller
 * uses the "neutral" state instead, since there's no scoring to apply.
 *
 * @param {string} tag         The tag value (unlowered).
 * @param {string[]} tagTerms  The active query terms (unlowered).
 * @returns {"matched"|"partial"|"unmatched"}
 */
export function classifyTag(tag, tagTerms) {
    let leniently = false;
    for (const term of tagTerms) {
        if (termMatchesTagExactly(term, tag)) return "matched";
        if (termMatchesTagLeniently(term, tag)) leniently = true;
    }
    return leniently ? "partial" : "unmatched";
}

/**
 * Toggle the per-pill state classes on each visible pill in a tab.
 *
 * Four styles drive four classes:
 *   - neutral   (no active tag search): `.tagger-pill-neutral`, matches the config tag boxes
 *   - matched   (exact term match): no extra class, default green
 *   - partial   (matched leniently, API would skip): `.tagger-pill-partial`, amber
 *   - unmatched (row visible via a sibling tag, this tag matches nothing): `.tagger-pill-unmatched`, gray
 *
 * Runs after the base `_applyFilters` loop so we only annotate visible rows; hidden rows
 * have no pills the user can see anyway.
 *
 * @param {object} tab          PlaceableTab instance.
 * @param {string[]} tagTerms   The active query terms.
 */
function annotatePartialMatches(tab, tagTerms) {
    const searching = tagTerms.length > 0;
    for (const li of tab.element.querySelectorAll("[data-entry-id]")) {
        const active = !li.hidden && searching;
        for (const pill of li.querySelectorAll(".tagger-pill")) {
            const tag = pill.dataset.tag ?? pill.textContent ?? "";
            const state = active ? classifyTag(tag, tagTerms) : "neutral";
            pill.classList.toggle("tagger-pill-neutral", state === "neutral");
            pill.classList.toggle("tagger-pill-partial", state === "partial");
            pill.classList.toggle("tagger-pill-unmatched", state === "unmatched");
            // Tooltip explains the pill's colour state and prefixes the module name so users
            // know which module is responsible for the affordance.  The neutral state doubles
            // as feature discovery for the `tag:` search prefix; once a search is active the
            // user already knows about it, so matched pills get no tooltip.
            switch (state) {
                case "partial":
                    pill.title = "Tagger | Partial match";
                    break;
                case "unmatched":
                    pill.title = "Tagger | Doesn't match search";
                    break;
                case "neutral":
                    // Use this pill's actual tag value so the hint is directly actionable:
                    // the user can copy the suggestion verbatim into the search box.  Quote
                    // the tag if it contains whitespace, mirroring the parser's `tag:"foo bar"` form.
                    pill.title = `Tagger | Search with tag:${/\s/.test(tag) ? `"${tag}"` : tag}`;
                    break;
                default:
                    pill.removeAttribute("title");
            }
        }
    }
}

/**
 * Wrap `_matchesFilter` on a PlaceableTab class so it ANDs the tag-term check with the
 * original implementation.  The tab-specific subclasses (TileTab, RegionTab, WallTab,
 * AmbientLightTab) override `_matchesFilter` without calling super, so we have to wrap
 * each one directly rather than relying on prototype-chain inheritance.
 *
 * The wrapper reads terms off `this[TAG_TERMS]`, which the `_applyFilters` wrapper
 * sets at the start of each filter pass and clears at the end.
 *
 * @param {Function} TabClass
 */
function wrapMatchesFilter(TabClass) {
    if (!TabClass?.prototype) return;
    const proto = TabClass.prototype;
    if (proto[PATCHED]) return;
    const original = proto._matchesFilter;
    proto._matchesFilter = function _matchesFilterWithTagger(entry) {
        if (original && !original.call(this, entry)) return false;
        const terms = this[TAG_TERMS];
        if (!terms?.length) return true;
        return entryMatchesTagTerms(entry, terms);
    };
    proto[PATCHED] = true;
}

/**
 * Patch PlaceableTab.prototype + every subclass to support `tag:` terms in the search query.
 * Idempotent via a string-key marker on each prototype.
 *
 * The integration runs in two halves:
 *   1. `_applyFilters` wrapper: parses the raw query into name + tag terms, swaps the
 *      SearchFilter regex to the cleaned name (so the base name-match pass doesn't see
 *      the literal `tag:foo`), stashes terms on `this`, and lets the base run.
 *   2. `_matchesFilter` wrapper (on each subclass): runs as part of the base loop, so its
 *      verdict feeds into `refreshState`/`_updateFilterPip` correctly.
 *
 * @returns {boolean} true once the patch is in place; false on Foundry versions earlier than v14.
 */
function patchPlaceableTab() {
    const tabs = foundry.applications?.sidebar?.tabs;
    const PlaceableTab = tabs?.PlaceableTab;
    if (!PlaceableTab) return false;
    const proto = PlaceableTab.prototype;
    if (proto[PATCHED]) return true;

    const originalApplyFilters = proto._applyFilters;

    proto._applyFilters = function _applyFiltersWithTagger() {
        const sf = this._searchFilter;
        const rawQuery = sf?.query ?? "";
        const { nameQuery, tagTerms } = parseSidebarQuery(rawQuery);

        let restoredRgx = null;
        let didSwap = false;
        if (tagTerms.length && sf) {
            restoredRgx = sf.rgx;
            didSwap = true;
            // Mirror SearchFilter#filter (applications/ux/search-filter.mjs:179-180):
            // query is normalized via cleanQuery, then escaped into a case-insensitive regex.
            // If Foundry changes how `rgx` is built, I'll need to update this block to match.
            const cleaned = sf.constructor.cleanQuery(nameQuery);
            sf.rgx = new RegExp(RegExp.escape(cleaned), "i");
        }

        this[TAG_TERMS] = tagTerms;
        try {
            originalApplyFilters.call(this);
        } finally {
            this[TAG_TERMS] = null;
            if (didSwap) sf.rgx = restoredRgx;
        }
        // After the base loop has settled visibility, mark pills the API would skip.
        // Always called (even with no terms) so that clearing the search removes any
        // stale `.tagger-pill-partial` classes left over from a previous query.
        annotatePartialMatches(this, tagTerms);
    };

    // Wrap _matchesFilter on the base class plus every known subclass, so the tag check
    // joins each tab's existing filter logic via AND.  Wrapping the base alone is not
    // sufficient: subclasses below override _matchesFilter without calling super.
    wrapMatchesFilter(PlaceableTab);
    for (const name of [
        "TokenTab", "TileTab", "DrawingTab", "WallTab", "RegionTab",
        "AmbientLightTab", "AmbientSoundTab", "NoteTab",
    ]) {
        wrapMatchesFilter(tabs[name]);
    }

    proto[PATCHED] = true;
    return true;
}

/**
 * Build the `.tagger-pills` block for an entry's current tags and replace any prior
 * pill block on the same `<li>`.  When the entry has no tags, the prior block is
 * removed and nothing new is appended, so the row collapses back to its base layout.
 *
 * @param {HTMLElement} li     The placeable entry row.
 * @param {foundry.abstract.Document} entry
 */
function refreshPillsForEntry(li, entry) {
    li.querySelector(":scope > .tagger-pills")?.remove();
    const tags = Tagger.getTags(entry);
    if (!tags?.length) return;
    const pillBox = document.createElement("div");
    pillBox.className = "tagger-pills";
    for (const tag of tags) {
        const pill = document.createElement("span");
        pill.className = "tagger-pill";
        pill.textContent = tag;
        // dataset.tag preserves the canonical value for partial-match detection,
        // independent of any future textContent transforms (truncation, icons, etc.).
        pill.dataset.tag = tag;
        pillBox.appendChild(pill);
    }
    li.appendChild(pillBox);
}

/**
 * Render handler: inject tag pills into each entry row in the sidebar.
 *
 * @param {object} app  PlaceableTab instance.
 * @param {HTMLElement} html
 */
function onRenderPlaceableTab(app, html) {
    const collection = canvas?.scene?.getEmbeddedCollection?.(app.collectionName);
    if (!collection) return;
    for (const li of html.querySelectorAll("[data-entry-id]")) {
        const entry = collection.get(li.dataset.entryId);
        if (entry) refreshPillsForEntry(li, entry);
    }
}

/**
 * Locate the open PlaceableTab whose collection contains the given document, if any.
 * Returns null when the placeables sidebar isn't open, or when the active sub-tab is for
 * a different document type.  The directory caches inactive tab apps too, but we only care
 * about the visible one because pill DOM only exists on the rendered tab.
 *
 * @param {foundry.abstract.Document} doc
 * @returns {object|null}
 */
function findActiveTabForDocument(doc) {
    const tab = ui.placeables?.tab;
    if (!tab?.rendered) return null;
    const collectionName = doc.parent?.constructor.getCollectionName?.(doc.documentName);
    if (!collectionName || tab.collectionName !== collectionName) return null;
    return tab;
}

/**
 * Re-apply pills for a single document in the open sidebar tab, then re-run the
 * partial-match annotation pass so the new pills participate in the active query
 * styling.  Cheap: touches only the one row that changed.
 *
 * @param {foundry.abstract.Document} doc
 */
function refreshPillsForDocument(doc) {
    const tab = findActiveTabForDocument(doc);
    if (!tab) return;
    const li = tab.element.querySelector(`[data-entry-id="${doc.id}"]`);
    if (!li) return;
    refreshPillsForEntry(li, doc);
    // Re-derive tag terms from the SearchFilter's current raw query so the annotation
    // stays in sync with whatever the user currently has typed.
    const rawQuery = tab._searchFilter?.query ?? "";
    const { tagTerms } = parseSidebarQuery(rawQuery);
    annotatePartialMatches(tab, tagTerms);
}

/**
 * Add a placeholder hint (`tag:foo`) to the sidebar search input on first render.
 *
 * @param {object} app
 * @param {HTMLElement} html
 */
function onRenderPlaceableTabHint(app, html) {
    const search = html.querySelector('input[type="search"]');
    if (!search) return;
    const existing = search.placeholder ?? "";
    if (existing && !existing.includes("tag:")) {
        search.placeholder = `${existing} (tag:foo)`;
    }
}

/**
 * Document types whose updates should refresh sidebar pills.  Mirrors the set of
 * placeables that have a sidebar tab in v14 (see CONFIG.Canvas.layers).  Each name is
 * the document name passed to `update<X>` hooks.
 */
const TAGGED_DOCUMENT_TYPES = [
    "Token", "Tile", "Drawing", "Wall", "AmbientLight",
    "AmbientSound", "MeasuredTemplate", "Note", "Region",
];

/**
 * Register the sidebar-tab integration on Foundry v14+; returns silently on earlier versions.
 */
export function registerSidebarTabIntegration() {
    if (!patchPlaceableTab()) return;
    Hooks.on("renderPlaceableTab", onRenderPlaceableTab);
    Hooks.on("renderPlaceableTab", onRenderPlaceableTabHint);
    // Foundry's sidebar directory re-renders on document update, but it skips its inner
    // PlaceableTab part on subsequent renders (placeable-directory.mjs:_configureRenderParts).
    // Patching the affected row's pills directly is cheaper than forcing a full tab render
    // and avoids resetting scroll/filter state.  Only flag updates that touch the tags
    // path warrant a refresh; everything else leaves the pills as-is.
    for (const docType of TAGGED_DOCUMENT_TYPES) {
        Hooks.on(`update${docType}`, (doc, change) => {
            if (!foundry.utils.hasProperty(change, CONSTANTS.BASE_PROPERTY)) return;
            refreshPillsForDocument(doc);
        });
    }
}
