// This is the actual entry point for #things.

import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

import {openAggregate, showAggregate} from '#aggregate';
import CacheableObject from '#cacheable-object';
import {logError} from '#cli';
import {compositeFrom} from '#composite';
import * as serialize from '#serialize';
import {empty} from '#sugar';
import Thing from '#thing';

import * as indexExports from './index.js';

const thingConstructors = Object.create(null);

// src/data/things/index.js -> src/
const __dirname = path.dirname(
  path.resolve(
    fileURLToPath(import.meta.url),
    '../..'));

function niceShowAggregate(error, ...opts) {
  showAggregate(error, {
    pathToFileURL: (f) => path.relative(__dirname, fileURLToPath(f)),
    showClasses: false,
    ...opts,
  });
}

function sortThingConstructors() {
  let remaining = [];
  for (const constructor of Object.values(indexExports)) {
    if (typeof constructor !== 'function') continue;
    if (!(constructor.prototype instanceof Thing)) continue;
    remaining.push(constructor);
  }

  let sorted = [];
  while (true) {
    if (sorted[0]) {
      const superclass = Object.getPrototypeOf(sorted[0]);
      if (superclass !== Thing) {
        if (sorted.includes(superclass)) {
          sorted.unshift(...sorted.splice(sorted.indexOf(superclass), 1));
        } else {
          sorted.unshift(superclass);
        }
        continue;
      }
    }

    if (!empty(remaining)) {
      sorted.unshift(remaining.shift());
    } else {
      break;
    }
  }

  for (const constructor of sorted) {
    thingConstructors[constructor.name] = constructor;
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

  for (const [name, constructor] of Object.entries(thingConstructors)) {
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

    /*
    if (error.errors) {
      for (const sub of error.errors) {
        console.error(sub);
      }
    }
    */

    return false;
  }
}

function evaluatePropertyDescriptors() {
  const opts = {...thingConstructors};

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

      constructor[CacheableObject.propertyDescriptors] =
        Object.create(constructor[CacheableObject.propertyDescriptors] ?? null);

      Object.assign(constructor[CacheableObject.propertyDescriptors], results);
    },

    showFailedClasses(failedClasses) {
      logError`Failed to evaluate property descriptors for classes: ${failedClasses.join(', ')}`;
    },
  });
}

function evaluateSerializeDescriptors() {
  const opts = {...thingConstructors, serialize};

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

function finalizeYamlDocumentSpecs() {
  return descriptorAggregateHelper({
    message: `Errors finalizing Thing YAML document specs`,

    op(constructor) {
      const superclass = Object.getPrototypeOf(constructor);
      if (
        constructor[Thing.yamlDocumentSpec] &&
        superclass[Thing.yamlDocumentSpec]
      ) {
        constructor[Thing.yamlDocumentSpec] =
          Thing.extendDocumentSpec(superclass, constructor[Thing.yamlDocumentSpec]);
      }
    },

    showFailedClasses(failedClasses) {
      logError`Failed to finalize YAML document specs for classes: ${failedClasses.join(', ')}`;
    },
  });
}

function finalizeCacheableObjectPrototypes() {
  return descriptorAggregateHelper({
    message: `Errors finalizing Thing class prototypes`,

    op(constructor) {
      constructor.finalizeCacheableObjectPrototype();
    },

    showFailedClasses(failedClasses) {
      logError`Failed to finalize cacheable object prototypes for classes: ${failedClasses.join(', ')}`;
    },
  });
}

sortThingConstructors();

if (!evaluatePropertyDescriptors()) process.exit(1);
if (!evaluateSerializeDescriptors()) process.exit(1);
if (!finalizeYamlDocumentSpecs()) process.exit(1);
if (!finalizeCacheableObjectPrototypes()) process.exit(1);

Object.assign(thingConstructors, {Thing});

export default thingConstructors;
