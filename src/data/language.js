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

function flattenLanguageSpec(spec) {
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
