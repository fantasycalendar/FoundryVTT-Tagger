#!/usr/bin/env node
/**
 * Generates the README API documentation block from JSDoc comments in
 * src/tagger.js, then writes the result into README.md between the
 * markers:
 *
 * <!-- API:START -->
 * <!-- API:END -->
 *
 * Code examples are read from `@example` blocks in each method's
 * JSDoc. A method with one `@example` renders an `Example:` heading;
 * two or more render `Examples:`. Options-bag parameters use `@typedef`
 * blocks at module scope; the generator expands their `@property` list
 * inline into the README's table cell. Re-run with:
 *   node scripts/generate-api-docs.js
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "..");
const SOURCE_FILE = resolve(REPO_ROOT, "src/tagger.js");
const README_FILE = resolve(REPO_ROOT, "README.md");

const START_MARKER = "<!-- API:START -->";
const END_MARKER = "<!-- API:END -->";

/**
 * Whitespace inserted between consecutive `<br>- prop {Type} - desc`
 * entries when expanding a typedef inline. The original
 * `jsdoc-to-markdown` output used a long whitespace run as visual
 * separation in the source markdown; runs of whitespace collapse in
 * rendered tables anyway, so the count is decorative.
 */
const TYPEDEF_ENTRY_GAP = " ".repeat(45);

/**
 * Walk every `/​** ... *​/` JSDoc block in the source and yield
 * `{ rawDoc, after }` pairs, where `after` is the source text starting
 * immediately past the block's closing `*​/`. The body match is
 * single-block-safe: the `(?:(?!\*\/)[\s\S])*` lookahead prevents the
 * non-greedy form from spanning past an intermediate `*​/` when the
 * caller's outer regex would otherwise need backtracking to fail.
 */
function* iterateJsDocBlocks(source) {
	const re = /\/\*\*((?:(?!\*\/)[\s\S])*)\*\//g;
	let m;
	while ((m = re.exec(source)) !== null) {
		yield { rawDoc: m[1], after: source.slice(re.lastIndex) };
	}
}

/**
 * Extract every JSDoc block immediately followed by a `static <name>(...)`
 * declaration. Returns an array of `{ name, params, doc }` in source
 * order. `doc` is the raw block content (without the `/**` and `*​/`
 * delimiters) with the leading `\t * ` (or ` * `) prefix already stripped.
 */
function extractStaticMethods(source) {
	const out = [];
	for (const { rawDoc, after } of iterateJsDocBlocks(source)) {
		const m = after.match(/^\s*static\s+(?:async\s+)?(\w+)\s*\(([^)]*)\)/);
		if (!m) continue;
		const [, name, params] = m;
		if (name.startsWith("_")) continue;
		out.push({
			name,
			params: params.split(",").map((p) => p.trim().split("=")[0].trim()).filter(Boolean),
			doc: stripCommentPrefix(rawDoc),
		});
	}
	return out;
}

/**
 * Extract every standalone `/​** @typedef ... *​/` block: a JSDoc block
 * NOT immediately followed by a `static <name>(...)` declaration whose
 * body contains an `@typedef` tag. Returns a Map from typedef name to
 * `{ properties: [...] }` where each property is
 * `{ name, type, desc, optional }`.
 */
function extractTypedefs(source) {
	const map = new Map();
	for (const { rawDoc, after } of iterateJsDocBlocks(source)) {
		if (/^\s*static\s/.test(after)) continue;
		const stripped = stripCommentPrefix(rawDoc);
		const td = parseTypedef(stripped);
		if (td) map.set(td.name, td);
	}
	return map;
}

/** Strip the leading `\t * ` / ` * ` from each line of a JSDoc block body. */
function stripCommentPrefix(rawDoc) {
	return rawDoc
		.split("\n")
		.map((line) => line.replace(/^[\t ]*\*[ ]?/, ""))
		.join("\n")
		.trim();
}

/**
 * Parse a stripped JSDoc body for a single `@typedef` definition. Returns
 * `null` if no `@typedef` line is present. Expected shape:
 *
 *   @typedef {Object} TypeName
 *   @property {Type} [name] description text
 *   @property {Type} name description text
 *
 * Continuation lines without a leading `@` are appended to the previous
 * `@property`'s description, mirroring how `parseJsDoc` handles
 * continuations.
 */
function parseTypedef(stripped) {
	const lines = stripped.split("\n");
	let name = null;
	const properties = [];
	let current = null;

	const finalize = () => {
		if (current) properties.push(current);
		current = null;
	};

	for (const line of lines) {
		const typedefMatch = line.match(/^@typedef\s+\{[^}]+\}\s+(\w+)\s*$/);
		const propMatch = line.match(/^@property\s+\{([^}]+)\}\s+(\[?\w+\]?)\s*(.*)$/);
		if (typedefMatch) {
			name = typedefMatch[1];
		} else if (propMatch) {
			finalize();
			const [, type, rawName, desc] = propMatch;
			const optional = rawName.startsWith("[") && rawName.endsWith("]");
			current = {
				name: optional ? rawName.slice(1, -1) : rawName,
				type,
				optional,
				desc: desc.trim(),
			};
		} else if (current && line.trim().length) {
			current.desc += " " + line.trim();
		}
	}
	finalize();

	if (!name) return null;
	return { name, properties };
}

/**
 * Parse a stripped JSDoc body into { description, params, returns,
 * examples }.
 *
 * Continuation lines for a tag (no leading `@`) are concatenated to
 * that tag's text. For `@param`/`@returns` they're concatenated
 * verbatim, preserving internal whitespace.
 *
 * `@example` blocks collect their continuation lines as an array of
 * source lines (one entry per line). Each `@example` starts a new
 * block.
 */
function parseJsDoc(stripped) {
	const lines = stripped.split("\n");
	const description = [];
	const params = [];
	const examples = [];
	let returns = null;
	let current = null;

	const finalize = () => {
		if (!current) return;
		if (current.kind === "param") params.push(current.value);
		else if (current.kind === "returns") returns = current.value;
		else if (current.kind === "example") examples.push(current.value);
		current = null;
	};

	for (const line of lines) {
		const paramMatch = line.match(/^@param\s+\{([^}]+)\}\s+(\[?\w+\]?)\s*(.*)$/);
		const returnsMatch = line.match(/^@returns?\s+\{([^}]+)\}\s*(.*)$/);
		const exampleMatch = line.match(/^@example\s*(.*)$/);
		if (paramMatch) {
			finalize();
			const [, type, rawName, desc] = paramMatch;
			const optional = rawName.startsWith("[") && rawName.endsWith("]");
			current = {
				kind: "param",
				value: {
					type,
					name: optional ? rawName.slice(1, -1) : rawName,
					optional,
					desc,
				},
			};
		} else if (returnsMatch) {
			finalize();
			const [, type, desc] = returnsMatch;
			current = { kind: "returns", value: { type, desc } };
		} else if (exampleMatch) {
			finalize();
			const [, rest] = exampleMatch;
			const initial = rest.length ? [rest] : [];
			current = { kind: "example", value: initial };
		} else if (current) {
			if (current.kind === "param" || current.kind === "returns") {
				current.value.desc += line;
			} else if (current.kind === "example") {
				current.value.push(line);
			}
		} else {
			description.push(line);
		}
	}
	finalize();

	return {
		description: description.join("\n").trim(),
		params,
		returns,
		examples: examples.map(trimTrailingBlankLines),
	};
}

/**
 * `@example` blocks tend to end with a blank line before the next tag
 * (e.g. `@param`); the blank gets captured into the example. Trim
 * trailing blank lines so the rendered ```js block doesn't gain an
 * empty tail line.
 */
function trimTrailingBlankLines(lines) {
	const out = lines.slice();
	while (out.length && out[out.length - 1].trim() === "") out.pop();
	return out;
}

/**
 * `jsdoc-to-markdown` renders `Array<X>` as `Array.&lt;X&gt;`, escapes
 * `<` and `>`, and writes type unions like `String|Array` as
 * `String/Array`. Tagger's JSDoc already uses the `/` form, so we only
 * need to encode angle brackets here.
 */
function formatType(type) {
	return type
		.replace(/Array<([^>]+)>/g, "Array.<$1>")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function paramSignature(method) {
	return `${method.name}(${method.params.join(", ")})`;
}

function returnsLabel(returns) {
	return returns ? `<code>${formatType(returns.type)}</code>` : "<code>void</code>";
}

function summaryLine(method, doc) {
	const sig = paramSignature(method);
	const returnsType = returnsLabel(doc.returns);
	const firstSentence = stripMarkdownEmphasis(doc.description.split("\n")[0]);
	return `<dt><a href="#${method.name}">Tagger.${sig}</a> ⇒ ${returnsType}</dt>\n<dd><p>${firstSentence}</p>\n</dd>`;
}

/**
 * The `<dl>` summary block is raw HTML, and GitHub-Flavored Markdown
 * does not render Markdown inside raw HTML blocks. So `**bold**` would
 * appear literally with asterisks. Strip emphasis markers from the
 * summary text; the per-method section below renders them correctly.
 */
function stripMarkdownEmphasis(text) {
	return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1");
}

/**
 * If a `@param`'s type names a known `@typedef`, expand the typedef's
 * properties as inline `<br>- ` + "`prop`" + ` {Type} - desc` entries
 * appended to the param description. The header text comes from the
 * param's own description (typically "An optional object that can
 * contain any of the following:") and is preserved as-is.
 *
 * Property names are wrapped in backticks so they render as inline
 * code in the README rather than plain text.
 *
 * Otherwise, return the description verbatim.
 *
 * The type column shown in the README falls back to `Object` for
 * typedef-typed params, matching the convention of the original docs.
 */
function expandParam(param, typedefs) {
	const typedef = typedefs.get(param.type);
	if (!typedef) {
		return { type: param.type, desc: param.desc };
	}

	const widest = typedef.properties.reduce((max, p) => {
		const head = `\`${p.name}\` {${p.type}}`;
		return head.length > max ? head.length : max;
	}, 0);

	const entries = typedef.properties.map((p) => {
		const head = `\`${p.name}\` {${p.type}}`;
		const padding = " ".repeat(widest - head.length);
		return `<br>- ${head}${padding} - ${p.desc}`;
	});

	const desc = `${param.desc.trimEnd()}${TYPEDEF_ENTRY_GAP}${entries.join(TYPEDEF_ENTRY_GAP)}`;
	return { type: "Object", desc };
}

function paramTable(params, typedefs) {
	const header = "| Param | Type | Description |\n| --- | --- | --- |";
	const rows = params.map((p) => {
		const expanded = expandParam(p, typedefs);
		return `| ${p.name} | <code>${formatType(expanded.type)}</code> | ${expanded.desc} |`;
	});
	return [header, ...rows].join("\n");
}

/**
 * Render one or more `@example` blocks as a single fenced ```js code
 * block. Multiple examples are joined with a blank line between them,
 * matching the original README's "Examples:" sections that listed
 * several use cases inside one fence. The heading becomes "Example:"
 * for one block and "Examples:" for two or more.
 */
function exampleBlock(examples) {
	if (!examples.length) return "";
	const label = examples.length === 1 ? "Example:" : "Examples:";
	const body = examples.map((lines) => lines.join("\n")).join("\n\n");
	return `${label}\n\`\`\`js\n${body}\n\`\`\`\n\n`;
}

function methodSection(method, doc, typedefs) {
	const sig = paramSignature(method);
	const returnsType = returnsLabel(doc.returns);
	const returnsLine = doc.returns
		? `**Returns**: ${returnsType} - ${doc.returns.desc}`
		: "";

	return [
		`<a name="${method.name}"></a>`,
		"",
		`## Tagger.${sig} ⇒ ${returnsType}`,
		"",
		exampleBlock(doc.examples) + doc.description,
		"",
		returnsLine,
		"",
		paramTable(doc.params, typedefs),
	].join("\n");
}

function buildBlock(methods, typedefs) {
	const summary = [
		"## Functions",
		"",
		"<dl>",
		...methods.map(({ method, doc }) => summaryLine(method, doc)),
		'<dt><a href="#tagRules">Tag Rules</a></dt>',
		"<dd><p>Tag rules that are applied on object creation.</p>",
		"</dd>",
		"</dl>",
		"",
	].join("\n");

	const sections = methods
		.map(({ method, doc }) => methodSection(method, doc, typedefs))
		.join("\n\n");

	const tagRules = [
		'<a name="tagRules"></a>',
		"",
		"## Tag Rules",
		"",
		"| Tag Rule | Description |",
		"| -------- | ----------- |",
		"| `{#}` | The `{#}` gets replaced with an unique number, and the number depends on how many other objects in the scene also has that tag |",
		"| `{id}` | The `{id}` gets replaced with an unique ID |",
	].join("\n");

	return [summary, sections, "", tagRules].join("\n");
}

function spliceBlock(readme, block) {
	const startIdx = readme.indexOf(START_MARKER);
	const endIdx = readme.indexOf(END_MARKER);
	if (startIdx === -1 || endIdx === -1) {
		throw new Error(
			`README is missing API markers. Add\n  ${START_MARKER}\n  ${END_MARKER}\nwhere the generated block should appear.`
		);
	}
	if (endIdx < startIdx) {
		throw new Error("README API:END marker appears before API:START.");
	}
	const before = readme.slice(0, startIdx + START_MARKER.length);
	const after = readme.slice(endIdx);
	return `${before}\n${block}\n${after}`;
}

function main() {
	const source = readFileSync(SOURCE_FILE, "utf8");

	const typedefs = extractTypedefs(source);
	const rawMethods = extractStaticMethods(source);
	const methods = rawMethods.map((method) => ({
		method,
		doc: parseJsDoc(method.doc),
	}));

	const missingExamples = methods
		.filter(({ doc }) => doc.examples.length === 0)
		.map(({ method }) => method.name);
	for (const name of missingExamples) {
		console.warn(
			`warn: Method '${name}' has no @example block; section will render without an example.`
		);
	}

	const block = buildBlock(methods, typedefs);
	const readme = readFileSync(README_FILE, "utf8");
	const next = spliceBlock(readme, block);

	if (next === readme) {
		console.log("README API block already up to date.");
		return;
	}
	writeFileSync(README_FILE, next);
	console.log(`Updated API block for ${methods.length} methods in README.md`);
}

main();
