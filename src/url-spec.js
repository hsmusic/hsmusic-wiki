// Exports defined here are re-exported through urls.js,
// so they're generally imported from '#urls'.

import {readFile} from 'node:fs/promises';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

import yaml from 'js-yaml';

import {annotateError, annotateErrorWithFile, openAggregate} from '#aggregate';
import {empty, typeAppearance, withEntries} from '#sugar';

export const DEFAULT_URL_SPEC_FILE = 'url-spec-default.yaml';

export const internalDefaultURLSpecFile =
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    DEFAULT_URL_SPEC_FILE);

function processStringToken(key, token) {
  const oops = appearance =>
    new Error(
      `Expected ${key} to be a string or an array of strings, ` +
      `got ${appearance}`);

  if (typeof token === 'string') {
    return token;
  } else if (Array.isArray(token)) {
    if (empty(token)) {
      throw oops(`empty array`);
    } else if (token.every(item => typeof item !== 'string')) {
      throw oops(`array of non-strings`);
    } else if (token.some(item => typeof item !== 'string')) {
      throw oops(`array of mixed strings and non-strings`);
    } else {
      return token.join('');
    }
  } else {
    throw oops(typeAppearance(token));
  }
}

// Mutates, so don't even think about reusing the original representation.
function processObjectToken(key, token) {
  const oops = appearance =>
    new Error(
      `Expected ${key} to be an object or an array of objects, ` +
      `got ${appearance}`);

  const looksLikeObject = value =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value);

  if (looksLikeObject(token)) {
    return token;
  } else if (Array.isArray(token)) {
    if (empty(token)) {
      throw oops(`empty array`);
    } else if (token.every(item => !looksLikeObject(item))) {
      throw oops(`array of non-objects`);
    } else if (token.some(item => !looksLikeObject(item))) {
      throw oops(`array of mixed objects and non-objects`);
    } else {
      return Object.assign(...token);
    }
  }
}

function makeProcessToken(aggregate) {
  return (object, key, processFn) => {
    if (key in object) {
      const value = aggregate.call(processFn, key, object[key]);
      if (value === null) {
        delete object[key];
      } else {
        object[key] = value;
      }
    }
  };
}

export function processGroupSpec(groupKey, groupSpec) {
  const aggregate =
    openAggregate({message: `Errors procsesing group "${groupKey}"`});

  const processToken = makeProcessToken(aggregate);

  processToken(groupSpec, 'prefix', processStringToken);
  processToken(groupSpec, 'paths', processObjectToken);

  return {aggregate, result: groupSpec};
}

export function processURLSpec(sourceSpec) {
  const aggregate =
    openAggregate({message: `Errors processing URL spec`});

  const urlSpec = structuredClone(sourceSpec);

  delete urlSpec.yamlAliases;
  delete urlSpec.localizedWithBaseDirectory;

  aggregate.nest({message: `Errors processing groups`}, groupsAggregate => {
    Object.assign(urlSpec,
      withEntries(urlSpec, entries =>
        entries.map(([groupKey, groupSpec]) => [
          groupKey,
          groupsAggregate.receive(
            processGroupSpec(groupKey, groupSpec)),
        ])));
  });

  switch (sourceSpec.localizedWithBaseDirectory) {
    case '<auto>': {
      if (!urlSpec.localized) {
        aggregate.push(new Error(
          `Couldn't prepare 'localizedWithBaseDirectory' group, ` +
          `'localized' not available`));

        break;
      }

      if (!urlSpec.localized.paths) {
        aggregate.push(new Error(
          `Couldn't prepare 'localizedWithBaseDirectory' group, ` +
          `'localized' group's paths not available`));

        break;
      }

      const paths =
        withEntries(urlSpec.localized.paths, entries =>
          entries.map(([key, path]) => [key, '<>/' + path]));

      urlSpec.localizedWithBaseDirectory =
        Object.assign(
          structuredClone(urlSpec.localized),
          {paths});

      break;
    }

    case undefined:
      break;

    default:
      aggregate.push(new Error(
        `Expected 'localizedWithBaseDirectory' group to have value '<auto>' ` +
        `or not be set`));

      break;
  }

  return {aggregate, result: urlSpec};
}

export async function processURLSpecFromFile(file) {
  let contents;

  try {
    contents = await readFile(file, 'utf-8');
  } catch (caughtError) {
    throw annotateError(
      new Error(`Failed to read URL spec file`, {cause: caughtError}),
      error => annotateErrorWithFile(error, file));
  }

  let sourceSpec;
  let parseLanguage;

  try {
    if (path.extname(file) === '.yaml') {
      parseLanguage = 'YAML';
      sourceSpec = yaml.load(contents);
    } else {
      parseLanguage = 'JSON';
      sourceSpec = JSON.parse(contents);
    }
  } catch (caughtError) {
    throw annotateError(
      new Error(`Failed to parse URL spec file as valid ${parseLanguage}`, {cause: caughtError}),
      error => annotateErrorWithFile(error, file));
  }

  try {
    return processURLSpec(sourceSpec);
  } catch (caughtError) {
    throw annotateErrorWithFile(caughtError, file);
  }
}
