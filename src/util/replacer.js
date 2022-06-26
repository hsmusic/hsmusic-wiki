// @format

import { logError, logWarn } from "./cli.js";
import { escapeRegex } from "./sugar.js";

export function validateReplacerSpec(replacerSpec, { find, link }) {
  let success = true;

  for (const [
    key,
    { link: linkKey, find: findKey, value, html },
  ] of Object.entries(replacerSpec)) {
    if (!html && !link[linkKey]) {
      logError`The replacer spec ${key} has invalid link key ${linkKey}! Specify it in link specs or fix typo.`;
      success = false;
    }
    if (findKey && !find[findKey]) {
      logError`The replacer spec ${key} has invalid find key ${findKey}! Specify it in find specs or fix typo.`;
      success = false;
    }
  }

  return success;
}

// Syntax literals.
const tagBeginning = "[[";
const tagEnding = "]]";
const tagReplacerValue = ":";
const tagHash = "#";
const tagArgument = "*";
const tagArgumentValue = "=";
const tagLabel = "|";

const noPrecedingWhitespace = "(?<!\\s)";

const R_tagBeginning = escapeRegex(tagBeginning);

const R_tagEnding = escapeRegex(tagEnding);

const R_tagReplacerValue =
  noPrecedingWhitespace + escapeRegex(tagReplacerValue);

const R_tagHash = noPrecedingWhitespace + escapeRegex(tagHash);

const R_tagArgument = escapeRegex(tagArgument);

const R_tagArgumentValue = escapeRegex(tagArgumentValue);

const R_tagLabel = escapeRegex(tagLabel);

const regexpCache = {};

const makeError = (i, message) => ({ i, type: "error", data: { message } });
const endOfInput = (i, comment) =>
  makeError(i, `Unexpected end of input (${comment}).`);

// These are 8asically stored on the glo8al scope, which might seem odd
// for a recursive function, 8ut the values are only ever used immediately
// after they're set.
let stopped, stop_iMatch, stop_iParse, stop_literal;

function parseOneTextNode(input, i, stopAt) {
  return parseNodes(input, i, stopAt, true)[0];
}

function parseNodes(input, i, stopAt, textOnly) {
  let nodes = [];
  let escapeNext = false;
  let string = "";
  let iString = 0;

  stopped = false;

  const pushTextNode = (isLast) => {
    string = input.slice(iString, i);

    // If this is the last text node 8efore stopping (at a stopAt match
    // or the end of the input), trim off whitespace at the end.
    if (isLast) {
      string = string.trimEnd();
    }

    if (string.length) {
      nodes.push({ i: iString, iEnd: i, type: "text", data: string });
      string = "";
    }
  };

  const literalsToMatch = stopAt
    ? stopAt.concat([R_tagBeginning])
    : [R_tagBeginning];

  // The 8ackslash stuff here is to only match an even (or zero) num8er
  // of sequential 'slashes. Even amounts always cancel out! Odd amounts
  // don't, which would mean the following literal is 8eing escaped and
  // should 8e counted only as part of the current string/text.
  //
  // Inspired 8y this: https://stackoverflow.com/a/41470813
  const regexpSource = `(?<!\\\\)(?:\\\\{2})*(${literalsToMatch.join("|")})`;

  // There are 8asically only a few regular expressions we'll ever use,
  // 8ut it's a pain to hard-code them all, so we dynamically gener8te
  // and cache them for reuse instead.
  let regexp;
  if (regexpCache.hasOwnProperty(regexpSource)) {
    regexp = regexpCache[regexpSource];
  } else {
    regexp = new RegExp(regexpSource);
    regexpCache[regexpSource] = regexp;
  }

  // Skip whitespace at the start of parsing. This is run every time
  // parseNodes is called (and thus parseOneTextNode too), so spaces
  // at the start of syntax elements will always 8e skipped. We don't
  // skip whitespace that shows up inside content (i.e. once we start
  // parsing below), though!
  const whitespaceOffset = input.slice(i).search(/[^\s]/);

  // If the string is all whitespace, that's just zero content, so
  // return the empty nodes array.
  if (whitespaceOffset === -1) {
    return nodes;
  }

  i += whitespaceOffset;

  while (i < input.length) {
    const match = input.slice(i).match(regexp);

    if (!match) {
      iString = i;
      i = input.length;
      pushTextNode(true);
      break;
    }

    const closestMatch = match[0];
    const closestMatchIndex = i + match.index;

    if (textOnly && closestMatch === tagBeginning)
      throw makeError(i, `Unexpected [[tag]] - expected only text here.`);

    const stopHere = closestMatch !== tagBeginning;

    iString = i;
    i = closestMatchIndex;
    pushTextNode(stopHere);

    i += closestMatch.length;

    if (stopHere) {
      stopped = true;
      stop_iMatch = closestMatchIndex;
      stop_iParse = i;
      stop_literal = closestMatch;
      break;
    }

    if (closestMatch === tagBeginning) {
      const iTag = closestMatchIndex;

      let N;

      // Replacer key (or value)

      N = parseOneTextNode(input, i, [
        R_tagReplacerValue,
        R_tagHash,
        R_tagArgument,
        R_tagLabel,
        R_tagEnding,
      ]);

      if (!stopped) throw endOfInput(i, `reading replacer key`);

      if (!N) {
        switch (stop_literal) {
          case tagReplacerValue:
          case tagArgument:
            throw makeError(i, `Expected text (replacer key).`);
          case tagLabel:
          case tagHash:
          case tagEnding:
            throw makeError(i, `Expected text (replacer key/value).`);
        }
      }

      const replacerFirst = N;
      i = stop_iParse;

      // Replacer value (if explicit)

      let replacerSecond;

      if (stop_literal === tagReplacerValue) {
        N = parseNodes(input, i, [
          R_tagHash,
          R_tagArgument,
          R_tagLabel,
          R_tagEnding,
        ]);

        if (!stopped) throw endOfInput(i, `reading replacer value`);
        if (!N.length) throw makeError(i, `Expected content (replacer value).`);

        replacerSecond = N;
        i = stop_iParse;
      }

      // Assign first & second to replacer key/value

      let replacerKey, replacerValue;

      // Value is an array of nodes, 8ut key is just one (or null).
      // So if we use replacerFirst as the value, we need to stick
      // it in an array (on its own).
      if (replacerSecond) {
        replacerKey = replacerFirst;
        replacerValue = replacerSecond;
      } else {
        replacerKey = null;
        replacerValue = [replacerFirst];
      }

      // Hash

      let hash;

      if (stop_literal === tagHash) {
        N = parseNodes(input, i, [R_tagArgument, R_tagLabel, R_tagEnding]);

        if (!stopped) throw endOfInput(i, `reading hash`);

        if (!N) throw makeError(i, `Expected content (hash).`);

        hash = N;
        i = stop_iParse;
      }

      // Arguments

      const args = [];

      while (stop_literal === tagArgument) {
        N = parseOneTextNode(input, i, [
          R_tagArgumentValue,
          R_tagArgument,
          R_tagLabel,
          R_tagEnding,
        ]);

        if (!stopped) throw endOfInput(i, `reading argument key`);

        if (stop_literal !== tagArgumentValue)
          throw makeError(
            i,
            `Expected ${tagArgumentValue.literal} (tag argument).`
          );

        if (!N) throw makeError(i, `Expected text (argument key).`);

        const key = N;
        i = stop_iParse;

        N = parseNodes(input, i, [R_tagArgument, R_tagLabel, R_tagEnding]);

        if (!stopped) throw endOfInput(i, `reading argument value`);
        if (!N.length) throw makeError(i, `Expected content (argument value).`);

        const value = N;
        i = stop_iParse;

        args.push({ key, value });
      }

      let label;

      if (stop_literal === tagLabel) {
        N = parseOneTextNode(input, i, [R_tagEnding]);

        if (!stopped) throw endOfInput(i, `reading label`);
        if (!N) throw makeError(i, `Expected text (label).`);

        label = N;
        i = stop_iParse;
      }

      nodes.push({
        i: iTag,
        iEnd: i,
        type: "tag",
        data: { replacerKey, replacerValue, hash, args, label },
      });

      continue;
    }
  }

  return nodes;
}

export function parseInput(input) {
  try {
    return parseNodes(input, 0);
  } catch (errorNode) {
    if (errorNode.type !== "error") {
      throw errorNode;
    }

    const {
      i,
      data: { message },
    } = errorNode;

    let lineStart = input.slice(0, i).lastIndexOf("\n");
    if (lineStart >= 0) {
      lineStart += 1;
    } else {
      lineStart = 0;
    }

    let lineEnd = input.slice(i).indexOf("\n");
    if (lineEnd >= 0) {
      lineEnd += i;
    } else {
      lineEnd = input.length;
    }

    const line = input.slice(lineStart, lineEnd);

    const cursor = i - lineStart;

    throw new SyntaxError(fixWS`
            Parse error (at pos ${i}): ${message}
            ${line}
            ${"-".repeat(cursor) + "^"}
        `);
  }
}

function evaluateTag(node, opts) {
  const { find, input, language, link, replacerSpec, to, wikiData } = opts;

  const source = input.slice(node.i, node.iEnd);

  const replacerKeyImplied = !node.data.replacerKey;
  const replacerKey = replacerKeyImplied ? "track" : node.data.replacerKey.data;

  if (!replacerSpec[replacerKey]) {
    logWarn`The link ${source} has an invalid replacer key!`;
    return source;
  }

  const {
    find: findKey,
    link: linkKey,
    value: valueFn,
    html: htmlFn,
    transformName,
  } = replacerSpec[replacerKey];

  const replacerValue = transformNodes(node.data.replacerValue, opts);

  const value = valueFn
    ? valueFn(replacerValue)
    : findKey
    ? find[findKey](
        replacerKeyImplied ? replacerValue : replacerKey + `:` + replacerValue
      )
    : {
        directory: replacerValue,
        name: null,
      };

  if (!value) {
    logWarn`The link ${source} does not match anything!`;
    return source;
  }

  const enteredLabel = node.data.label && transformNode(node.data.label, opts);

  const label =
    enteredLabel ||
    (transformName && transformName(value.name, node, input)) ||
    value.name;

  if (!valueFn && !label) {
    logWarn`The link ${source} requires a label be entered!`;
    return source;
  }

  const hash = node.data.hash && transformNodes(node.data.hash, opts);

  const args =
    node.data.args &&
    Object.fromEntries(
      node.data.args.map(({ key, value }) => [
        transformNode(key, opts),
        transformNodes(value, opts),
      ])
    );

  const fn = htmlFn ? htmlFn : link[linkKey];

  try {
    return fn(value, { text: label, hash, args, language, to });
  } catch (error) {
    logError`The link ${source} failed to be processed: ${error}`;
    return source;
  }
}

function transformNode(node, opts) {
  if (!node) {
    throw new Error("Expected a node!");
  }

  if (Array.isArray(node)) {
    throw new Error("Got an array - use transformNodes here!");
  }

  switch (node.type) {
    case "text":
      return node.data;
    case "tag":
      return evaluateTag(node, opts);
    default:
      throw new Error(`Unknown node type ${node.type}`);
  }
}

function transformNodes(nodes, opts) {
  if (!nodes || !Array.isArray(nodes)) {
    throw new Error(`Expected an array of nodes! Got: ${nodes}`);
  }

  return nodes.map((node) => transformNode(node, opts)).join("");
}

export function transformInline(
  input,
  { replacerSpec, find, link, language, to, wikiData }
) {
  if (!replacerSpec) throw new Error("Expected replacerSpec");
  if (!find) throw new Error("Expected find");
  if (!link) throw new Error("Expected link");
  if (!language) throw new Error("Expected language");
  if (!to) throw new Error("Expected to");
  if (!wikiData) throw new Error("Expected wikiData");

  const nodes = parseInput(input);
  return transformNodes(nodes, {
    input,
    find,
    link,
    replacerSpec,
    language,
    to,
    wikiData,
  });
}
