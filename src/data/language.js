import EventEmitter from 'node:events';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import chokidar from 'chokidar';
import he from 'he'; // It stands for "HTML Entities", apparently. Cursed.
import yaml from 'js-yaml';

import {annotateError, annotateErrorWithFile, showAggregate, withAggregate}
  from '#aggregate';
import {externalLinkSpec} from '#external-links';
import {colors, logWarn} from '#cli';
import {splitKeys, withEntries} from '#sugar';
import T from '#things';

const {Language} = T;

export const DEFAULT_STRINGS_FILE = 'strings-default.yaml';

export const internalDefaultStringsFile =
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../',
    DEFAULT_STRINGS_FILE);

export function processLanguageSpec(spec, {existingCode = null} = {}) {
  const {
    'meta.languageCode': code,
    'meta.languageName': name,

    'meta.languageIntlCode': intlCode = null,
    'meta.hidden': hidden = false,

    ...strings
  } = spec;

  withAggregate({message: `Errors validating language spec`}, ({push}) => {
    if (!code) {
      push(new Error(`Missing language code`));
    }

    if (!name) {
      push(new Error(`Missing language name`));
    }

    if (code && existingCode && code !== existingCode) {
      push(new Error(`Language code (${code}) doesn't match previous value\n(You'll have to reload hsmusic to load this)`));
    }
  });

  return {code, intlCode, name, hidden, strings};
}

export function flattenLanguageSpec(spec) {
  const recursive = (keyPath, value) =>
    (typeof value === 'object'
      ? Object.assign({}, ...
          Object.entries(value)
            .map(([key, value]) =>
              (key === '_'
                ? {[keyPath]: value}
                : recursive(
                    (keyPath ? `${keyPath}.${key}` : key),
                    value))))
      : {[keyPath]: value});

  return recursive('', spec);
}

export function unflattenLanguageSpec(flat, reference) {
  const setNestedProp = (obj, key, value) => {
    const recursive = (o, k) => {
      if (k.length === 1) {
        o[k[0]] = value;
        return;
      }

      if (typeof o[k[0]] === 'undefined') {
        o[k[0]] = {};
      } else if (typeof o[k[0]] === 'string') {
        o[k[0]] = {_: o[k[0]]};
      }

      recursive(o[k[0]], k.slice(1));
    };

    return recursive(obj, splitKeys(key));
  };

  const walkEntries = (ownNode, refNode) => {
    const recursive = (refKeys, ownNode, refNode) => {
      const [firstKey, ...restKeys] = refKeys;

      if (typeof ownNode[firstKey] === 'undefined') {
        return undefined;
      }

      const result =
        (refKeys.length === 1
          ? walkEntry(ownNode[firstKey], refNode)
          : recursive(restKeys, ownNode[firstKey], refNode));

      if (typeof result === 'undefined') {
        return undefined;
      }

      if (typeof result === 'string') {
        delete ownNode[firstKey];
        return {[firstKey]: result};
      }

      if (refKeys.length > 1) {
        return withEntries(result, entries =>
          entries.map(([key, value]) => [`${firstKey}.${key}`, value]));
      } else {
        return {[firstKey]: result};
      }
    };

    let mapped;

    for (const [key, value] of Object.entries(refNode)) {
      const result = recursive(splitKeys(key), ownNode, refNode[key]);
      if (!result) continue;
      if (!mapped) mapped = {};
      Object.assign(mapped, result);
    }

    return mapped;
  };

  const walkEntry = (ownNode, refNode) => {
    if (
      typeof ownNode === 'object' &&
      typeof refNode === 'object'
    ) {
      return walkEntries(ownNode, refNode);
    }

    if (
      typeof ownNode === 'string' &&
      typeof refNode === 'object' &&
      typeof refNode._ === 'string'
    ) {
      return {_: ownNode};
    }

    if (
      typeof ownNode === 'object' &&
      typeof refNode === 'string' &&
      typeof ownNode._ === 'string'
    ) {
      return ownNode._;
    }

    if (
      typeof ownNode === 'string' &&
      typeof refNode === 'string'
    ) {
      return ownNode;
    }

    return undefined;
  };

  const clean = node => {
    if (typeof node === 'string') {
      return node;
    }

    const entries = Object.entries(node);
    if (entries.length === 0) {
      return undefined;
    }

    let results;
    for (const [key, value] of entries) {
      const cleanValue = clean(value);
      if (typeof cleanValue === 'undefined') continue;
      if (!results) results = {};
      results[key] = cleanValue;
    }

    return results;
  };

  const storage = {};
  for (const [key, value] of Object.entries(flat)) {
    setNestedProp(storage, key, value);
  }

  const rootResult = walkEntries(storage, reference);
  const spec = rootResult ?? {};

  const unmapped = clean(storage);
  if (unmapped) {
    spec['meta.unmapped'] = unmapped;
  }

  return spec;
}

async function processLanguageSpecFromFile(file, processLanguageSpecOpts) {
  let contents;

  try {
    contents = await readFile(file, 'utf-8');
  } catch (caughtError) {
    throw annotateError(
      new Error(`Failed to read language file`, {cause: caughtError}),
      error => annotateErrorWithFile(error, file));
  }

  let rawSpec;
  let parseLanguage;

  try {
    if (path.extname(file) === '.yaml') {
      parseLanguage = 'YAML';
      rawSpec = yaml.load(contents);
    } else {
      parseLanguage = 'JSON';
      rawSpec = JSON.parse(contents);
    }
  } catch (caughtError) {
    throw annotateError(
      new Error(`Failed to parse language file as valid ${parseLanguage}`, {cause: caughtError}),
      error => annotateErrorWithFile(error, file));
  }

  const flattenedSpec = flattenLanguageSpec(rawSpec);

  try {
    return processLanguageSpec(flattenedSpec, processLanguageSpecOpts);
  } catch (caughtError) {
    throw annotateErrorWithFile(caughtError, file);
  }
}

export function initializeLanguageObject() {
  const language = new Language();

  language.escapeHTML = string =>
    he.encode(string, {useNamedReferences: true});

  language.externalLinkSpec = externalLinkSpec;

  return language;
}

export async function processLanguageFile(file) {
  const language = initializeLanguageObject();
  const properties = await processLanguageSpecFromFile(file);
  return Object.assign(language, properties);
}

export function watchLanguageFile(file, {
  logging = true,
} = {}) {
  const basename = path.basename(file);

  const events = new EventEmitter();
  const language = initializeLanguageObject();

  let emittedReady = false;
  let successfullyAppliedLanguage = false;

  Object.assign(events, {language, close});

  const watcher = chokidar.watch(file);
  watcher.on('change', () => handleFileUpdated());

  setImmediate(handleFileUpdated);

  return events;

  async function close() {
    return watcher.close();
  }

  function checkReadyConditions() {
    if (emittedReady) return;
    if (!successfullyAppliedLanguage) return;

    events.emit('ready');
    emittedReady = true;
  }

  async function handleFileUpdated() {
    let properties;

    try {
      properties = await processLanguageSpecFromFile(file, {
        existingCode:
          (successfullyAppliedLanguage
            ? language.code
            : null),
      });
    } catch (error) {
      events.emit('error', error);

      if (logging) {
        const label =
          (successfullyAppliedLanguage
            ? `${language.name} (${language.code})`
            : basename);

        if (successfullyAppliedLanguage) {
          logWarn`Failed to load language ${label} - using existing version`;
        } else {
          logWarn`Failed to load language ${label} - no prior version loaded`;
        }
        showAggregate(error, {showTraces: false});
      }

      return;
    }

    Object.assign(language, properties);
    successfullyAppliedLanguage = true;

    if (logging && emittedReady) {
      const timestamp = new Date().toLocaleString('en-US', {timeStyle: 'medium'});
      console.log(colors.green(`[${timestamp}] Updated language ${language.name} (${language.code})`));
    }

    events.emit('update');
    checkReadyConditions();
  }
}
