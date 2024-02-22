import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

import {openAggregate, showAggregate} from '#aggregate';
import {logError} from '#cli';
import {compositeFrom} from '#composite';
import * as serialize from '#serialize';

import Thing from '#thing';

import * as albumClasses from './album.js';
import * as artTagClasses from './art-tag.js';
import * as artistClasses from './artist.js';
import * as flashClasses from './flash.js';
import * as groupClasses from './group.js';
import * as homepageLayoutClasses from './homepage-layout.js';
import * as languageClasses from './language.js';
import * as listingClasses from './listing.js';
import * as newsEntryClasses from './news-entry.js';
import * as staticPageClasses from './static-page.js';
import * as trackClasses from './track.js';
import * as wikiInfoClasses from './wiki-info.js';

const allClassLists = {
  'album.js': albumClasses,
  'art-tag.js': artTagClasses,
  'artist.js': artistClasses,
  'flash.js': flashClasses,
  'group.js': groupClasses,
  'homepage-layout.js': homepageLayoutClasses,
  'language.js': languageClasses,
  'listing.js': listingClasses,
  'news-entry.js': newsEntryClasses,
  'static-page.js': staticPageClasses,
  'track.js': trackClasses,
  'wiki-info.js': wikiInfoClasses,
};

let allClasses = Object.create(null);

// src/data/things/index.js -> src/
const __dirname = path.dirname(
  path.resolve(
    fileURLToPath(import.meta.url),
    '../..'));

function niceShowAggregate(error, ...opts) {
  showAggregate(error, {
    pathToFileURL: (f) => path.relative(__dirname, fileURLToPath(f)),
    ...opts,
  });
}

function errorDuplicateClassNames() {
  const locationDict = Object.create(null);

  for (const [location, classes] of Object.entries(allClassLists)) {
    for (const className of Object.keys(classes)) {
      if (className in locationDict) {
        locationDict[className].push(location);
      } else {
        locationDict[className] = [location];
      }
    }
  }

  let success = true;

  for (const [className, locations] of Object.entries(locationDict)) {
    if (locations.length === 1) {
      continue;
    }

    logError`Thing class name ${`"${className}"`} is defined more than once: ${locations.join(', ')}`;
    success = false;
  }

  return success;
}

function flattenClassLists() {
  for (const classes of Object.values(allClassLists)) {
    for (const [name, constructor] of Object.entries(classes)) {
      if (typeof constructor !== 'function') continue;
      if (!(constructor.prototype instanceof Thing)) continue;
      allClasses[name] = constructor;
    }
  }
}

function descriptorAggregateHelper({
  showFailedClasses,
  message,
  op,
}) {
  const failureSymbol = Symbol();
  const aggregate = openAggregate({
    message,
    returnOnFail: failureSymbol,
  });

  const failedClasses = [];

  for (const [name, constructor] of Object.entries(allClasses)) {
    const result = aggregate.call(op, constructor);

    if (result === failureSymbol) {
      failedClasses.push(name);
    }
  }

  try {
    aggregate.close();
    return true;
  } catch (error) {
    niceShowAggregate(error);
    showFailedClasses(failedClasses);
    return false;
  }
}

function evaluatePropertyDescriptors() {
  const opts = {...allClasses};

  return descriptorAggregateHelper({
    message: `Errors evaluating Thing class property descriptors`,

    op(constructor) {
      if (!constructor[Thing.getPropertyDescriptors]) {
        throw new Error(`Missing [Thing.getPropertyDescriptors] function`);
      }

      const results = constructor[Thing.getPropertyDescriptors](opts);

      for (const [key, value] of Object.entries(results)) {
        if (Array.isArray(value)) {
          results[key] = compositeFrom({
            annotation: `${constructor.name}.${key}`,
            compose: false,
            steps: value,
          });
        } else if (value.toResolvedComposition) {
          results[key] = compositeFrom(value.toResolvedComposition());
        }
      }

      constructor.propertyDescriptors = results;
    },

    showFailedClasses(failedClasses) {
      logError`Failed to evaluate property descriptors for classes: ${failedClasses.join(', ')}`;
    },
  });
}

function evaluateSerializeDescriptors() {
  const opts = {...allClasses, serialize};

  return descriptorAggregateHelper({
    message: `Errors evaluating Thing class serialize descriptors`,

    op(constructor) {
      if (!constructor[Thing.getSerializeDescriptors]) {
        return;
      }

      constructor[serialize.serializeDescriptors] =
        constructor[Thing.getSerializeDescriptors](opts);
    },

    showFailedClasses(failedClasses) {
      logError`Failed to evaluate serialize descriptors for classes: ${failedClasses.join(', ')}`;
    },
  });
}

if (!errorDuplicateClassNames())
  process.exit(1);

flattenClassLists();

if (!evaluatePropertyDescriptors())
  process.exit(1);

if (!evaluateSerializeDescriptors())
  process.exit(1);

Object.assign(allClasses, {Thing});

export default allClasses;
