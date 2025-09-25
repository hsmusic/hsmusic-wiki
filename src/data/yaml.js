// yaml.js - specification for HSMusic YAML data file format and utilities for
// loading, processing, and validating YAML files and documents

import {readFile, stat} from 'node:fs/promises';
import * as path from 'node:path';
import {inspect as nodeInspect} from 'node:util';

import yaml from 'js-yaml';

import * as fileLoadingSpecs from '#files';
import {colors, ENABLE_COLOR, logInfo, logWarn} from '#cli';
import {parseContentNodes, splitContentNodesAround} from '#replacer';
import {sortByName} from '#sort';
import Thing from '#thing';
import thingConstructors from '#things';
import {matchContentEntries} from '#wiki-data';

import {
  aggregateThrows,
  annotateErrorWithFile,
  decorateErrorWithIndex,
  decorateErrorWithAnnotation,
  openAggregate,
  showAggregate,
} from '#aggregate';

import {
  filterReferenceErrors,
  reportContentTextErrors,
  reportDirectoryErrors,
} from '#data-checks';

import {
  atOffset,
  empty,
  filterProperties,
  getNestedProp,
  stitchArrays,
  typeAppearance,
  unique,
  withEntries,
} from '#sugar';

function inspect(value, opts = {}) {
  return nodeInspect(value, {colors: ENABLE_COLOR, ...opts});
}

function makeEmptyWikiData() {
  const wikiData = {};

  for (const thingConstructor of Object.values(thingConstructors)) {
    if (thingConstructor[Thing.wikiData]) {
      if (thingConstructor[Thing.oneInstancePerWiki]) {
        wikiData[thingConstructor[Thing.wikiData]] = null;
      } else {
        wikiData[thingConstructor[Thing.wikiData]] = [];
      }
    }
  }

  return wikiData;
}

function pushWikiData(a, b) {
  for (const key of Object.keys(b)) {
    if (!Object.hasOwn(a, key)) {
      throw new Error(`${key} not present`);
    }

    if (Array.isArray(a[key])) {
      if (Array.isArray(b[key])) {
        a[key].push(...b[key]);
      } else {
        throw new Error(`${key} is an array, expected array of items to push`);
      }
    } else if (a[key] === null) {
      a[key] = b[key];
    } else if (b[key] !== null) {
      throw new Error(`${key} already has a value: ${inspect(a[key])}`);
    }
  }
}

// General function for inputting a single document (usually loaded from YAML)
// and outputting an instance of a provided Thing subclass.
//
// makeProcessDocument is a factory function: the returned function will take a
// document and apply the configuration passed to makeProcessDocument in order
// to construct a Thing subclass.
//
function makeProcessDocument(thingConstructor, {
  // The bulk of configuration happens here in the spec's `fields` property.
  // Each key is a field that's expected on the source document; fields that
  // don't match one of these keys will cause an error. Values are object
  // entries describing what to do with the field.
  //
  // A field entry's `property` tells what property the value for this field
  // will be put into, on the respective Thing (subclass) instance.
  //
  // A field entry's `transform` optionally allows converting the raw value in
  // YAML into some other format before providing setting it on the Thing
  // instance.
  //
  // If a field entry has `ignore: true`, it will be completely skipped by the
  // YAML parser - it won't be validated, read, or loaded into data objects.
  // This is mainly useful for fields that are purely annotational or are
  // currently placeholders.
  //
  fields: fieldSpecs = {},

  // List of fields which are invalid when coexisting in a document.
  // Data objects are generally allowing with regards to what properties go
  // together, allowing for properties to be set separately from each other
  // instead of complaining about invalid or unused-data cases. But it's
  // useful to see these kinds of errors when actually validating YAML files!
  //
  // Each item of this array should itself be an object with a descriptive
  // message and a list of fields. Of those fields, none should ever coexist
  // with any other. For example:
  //
  //   [
  //     {message: '...', fields: ['A', 'B', 'C']},
  //     {message: '...', fields: ['C', 'D']},
  //   ]
  //
  // ...means A can't coexist with B or C, B can't coexist with A or C, and
  // C can't coexist with A, B, or D - but it's okay for D to coexist with
  // A or B.
  //
  invalidFieldCombinations = [],

  // Bouncing function used to process subdocuments: this is a function which
  // in turn calls the appropriate *result of* makeProcessDocument.
  processDocument: bouncer,
}) {
  if (!thingConstructor) {
    throw new Error(`Missing Thing class`);
  }

  if (!fieldSpecs) {
    throw new Error(`Expected fields to be provided`);
  }

  if (!bouncer) {
    throw new Error(`Missing processDocument bouncer`);
  }

  const knownFields = Object.keys(fieldSpecs);

  const ignoredFields =
    Object.entries(fieldSpecs)
      .filter(([, {ignore}]) => ignore)
      .map(([field]) => field);

  const propertyToField =
    withEntries(fieldSpecs, entries => entries
      .map(([field, {property}]) => [property, field]));

  // TODO: Is this function even necessary??
  // Aren't we doing basically the same work in the function it's decorating???
  const decorateErrorWithName = (fn) => {
    const nameField = propertyToField.name;
    if (!nameField) return fn;

    return (document) => {
      try {
        return fn(document);
      } catch (error) {
        const name = document[nameField];
        error.message = name
          ? `(name: ${inspect(name)}) ${error.message}`
          : `(${colors.dim(`no name found`)}) ${error.message}`;
        throw error;
      }
    };
  };

  return decorateErrorWithName((document) => {
    const nameField = propertyToField.name;
    const namePart =
      (nameField
        ? (document[nameField]
          ? ` named ${colors.green(`"${document[nameField]}"`)}`
          : ` (name field, "${nameField}", not specified)`)
        : ``);

    const constructorPart =
      (thingConstructor[Thing.friendlyName]
        ? thingConstructor[Thing.friendlyName]
     : thingConstructor.name
        ? thingConstructor.name
        : `document`);

    const aggregate = openAggregate({
      ...aggregateThrows(ProcessDocumentError),
      message: `Errors processing ${constructorPart}` + namePart,
    });

    const thing = Reflect.construct(thingConstructor, []);

    const wikiData = makeEmptyWikiData();
    const flat = [thing];
    if (thingConstructor[Thing.wikiData]) {
      if (thingConstructor[Thing.oneInstancePerWiki]) {
        wikiData[thingConstructor[Thing.wikiData]] = thing;
      } else {
        wikiData[thingConstructor[Thing.wikiData]] = [thing];
      }
    }

    const documentEntries = Object.entries(document)
      .filter(([field]) => !ignoredFields.includes(field));

    const skippedFields = new Set();

    const unknownFields = documentEntries
      .map(([field]) => field)
      .filter((field) => !knownFields.includes(field));

    if (!empty(unknownFields)) {
      aggregate.push(new UnknownFieldsError(unknownFields));

      for (const field of unknownFields) {
        skippedFields.add(field);
      }
    }

    const presentFields = Object.keys(document);

    const fieldCombinationErrors = [];

    for (const {message, fields: fieldsSpec, drop} of invalidFieldCombinations) {
      const fieldsPresent =
        fieldsSpec.flatMap(fieldSpec => {
          if (Array.isArray(fieldSpec)) {
            const [field, match] = fieldSpec;
            if (!presentFields.includes(field)) return [];
            if (typeof match === 'function') {
              return match(document[field]) ? [field] : [];
            } else {
              return document[field] === match ? [field] : [];
            }
          }

          const field = fieldSpec;
          return presentFields.includes(field) ? [field] : [];
        });

      if (fieldsPresent.length >= 2) {
        const filteredDocument =
          filterProperties(
            document,
            fieldsPresent,
            {preserveOriginalOrder: true});

        fieldCombinationErrors.push(
          new FieldCombinationError(
            filteredDocument,
            fieldsSpec,
            message));

        const dropFields =
          (drop
            ? Object.keys(filteredDocument).filter(key => drop.includes(key))
            : Object.keys(filteredDocument));

        for (const field of dropFields) {
          skippedFields.add(field);
        }
      }
    }

    if (!empty(fieldCombinationErrors)) {
      aggregate.push(new FieldCombinationAggregateError(fieldCombinationErrors));
    }

    const fieldValues = {};

    const subdocSymbol = Symbol('subdoc');
    const subdocLayouts = {};

    const isSubdocToken = value =>
      typeof value === 'object' &&
      value !== null &&
      Object.hasOwn(value, subdocSymbol);

    const transformUtilities = {
      ...thingConstructors,

      subdoc(documentType, data, {
        bindInto = null,
        provide = null,
      } = {}) {
        if (!documentType)
          throw new Error(`Expected document type, got ${typeAppearance(documentType)}`);
        if (!data)
          throw new Error(`Expected data, got ${typeAppearance(data)}`);
        if (typeof data !== 'object' || data === null)
          throw new Error(`Expected data to be an object, got ${typeAppearance(data)}`);
        if (typeof bindInto !== 'string' && bindInto !== null)
          throw new Error(`Expected bindInto to be a string, got ${typeAppearance(bindInto)}`);
        if (typeof provide !== 'object' && provide !== null)
          throw new Error(`Expected provide to be an object, got ${typeAppearance(provide)}`);

        return {
          [subdocSymbol]: {
            documentType,
            data,
            bindInto,
            provide,
          },
        };
      },
    };

    for (const [field, documentValue] of documentEntries) {
      if (skippedFields.has(field)) continue;

      // This variable would like to certify itself as "not into capitalism".
      let propertyValue =
        (documentValue === null
          ? null
       : fieldSpecs[field].transform
          ? fieldSpecs[field].transform(documentValue, transformUtilities)
          : documentValue);

      // Completely blank items in a YAML list are read as null.
      // They're handy to have around when filling out a document and shouldn't
      // be considered an error (or data at all).
      if (Array.isArray(propertyValue)) {
        const wasEmpty = empty(propertyValue);

        propertyValue =
          propertyValue.filter(item => item !== null);

        const isEmpty = empty(propertyValue);

        // Don't set arrays which are empty as a result of the above filter.
        // Arrays which were originally empty, i.e. `Field: []`, are still
        // valid data, but if it's just an array not containing any filled out
        // items, it should be treated as a placeholder and skipped over.
        if (isEmpty && !wasEmpty) {
          propertyValue = null;
        }
      }

      if (isSubdocToken(propertyValue)) {
        subdocLayouts[field] = propertyValue[subdocSymbol];
        continue;
      }

      if (Array.isArray(propertyValue) && propertyValue.every(isSubdocToken)) {
        subdocLayouts[field] =
          propertyValue
            .map(token => token[subdocSymbol]);
        continue;
      }

      fieldValues[field] = propertyValue;
    }

    const subdocErrors = [];

    const followSubdocSetup = setup => {
      let error = null;

      let result;
      try {
        let aggregate;
        ({result, aggregate} = bouncer(setup.data, setup.documentType));
        aggregate.close();
      } catch (caughtError) {
        error = caughtError;
      }

      if (result.thing) {
        if (setup.bindInto) {
          result.thing[setup.bindInto] = thing;
        }

        if (setup.provide) {
          Object.assign(result.thing, setup.provide);
        }
      }

      pushWikiData(wikiData, result.wikiData);
      flat.push(...result.flat);

      return {error, subthing: result.thing};
    };

    for (const [field, layout] of Object.entries(subdocLayouts)) {
      if (Array.isArray(layout)) {
        const subthings = [];
        let anySucceeded = false;
        let anyFailed = false;

        for (const [index, setup] of layout.entries()) {
          const {subthing, error} = followSubdocSetup(setup);
          if (error) {
            subdocErrors.push(new SubdocError(
              {field, index},
              setup,
              {cause: error}));
          }

          if (subthing) {
            subthings.push(subthing);
            anySucceeded = true;
          } else {
            anyFailed = true;
          }
        }

        if (anySucceeded) {
          fieldValues[field] = subthings;
        } else if (anyFailed) {
          skippedFields.add(field);
        }
      } else {
        const setup = layout;
        const {subthing, error} = followSubdocSetup(setup);

        if (error) {
          subdocErrors.push(new SubdocError(
            {field},
            setup,
            {cause: error}));
        }

        if (subthing) {
          fieldValues[field] = subthing;
        } else {
          skippedFields.add(field);
        }
      }
    }

    if (!empty(subdocErrors)) {
      aggregate.push(new SubdocAggregateError(
        subdocErrors, thingConstructor));
    }

    const fieldValueErrors = [];

    for (const [field, value] of Object.entries(fieldValues)) {
      const {property} = fieldSpecs[field];

      try {
        thing[property] = value;
      } catch (caughtError) {
        skippedFields.add(field);
        fieldValueErrors.push(new FieldValueError(
          field, value, {cause: caughtError}));
      }
    }

    if (!empty(fieldValueErrors)) {
      aggregate.push(new FieldValueAggregateError(
        fieldValueErrors, thingConstructor));
    }

    if (skippedFields.size >= 1) {
      aggregate.push(
        new SkippedFieldsSummaryError(
          filterProperties(
            document,
            Array.from(skippedFields),
            {preserveOriginalOrder: true})));
    }

    return {
      aggregate,
      result: {
        thing,
        flat,
        wikiData,
      },
    };
  });
}

export class ProcessDocumentError extends AggregateError {}

export class UnknownFieldsError extends Error {
  constructor(fields) {
    super(`Unknown fields ignored: ${fields.map(field => colors.red(field)).join(', ')}`);
    this.fields = fields;
  }
}

export class FieldCombinationAggregateError extends AggregateError {
  constructor(errors) {
    super(errors, `Invalid field combinations - all involved fields ignored`);
  }
}

export class FieldCombinationError extends Error {
  constructor(filteredDocument, fieldsSpec, message) {
    const fieldNames = Object.keys(filteredDocument);

    const fieldNamesText =
      fieldNames
        .map(field => {
          if (fieldsSpec.includes(field)) {
            return colors.red(field);
          }

          const match =
            fieldsSpec
              .find(fieldSpec =>
                Array.isArray(fieldSpec) &&
                fieldSpec[0] === field)
              .at(1);

          if (typeof match === 'function') {
            return colors.red(`${field}: ${filteredDocument[field]}`);
          } else {
            return colors.red(`${field}: ${match}`);
          }
        })
        .join(', ');

    const mainMessage = `Don't combine ${fieldNamesText}`;

    const causeMessage =
      (typeof message === 'function'
        ? message(filteredDocument)
     : typeof message === 'string'
        ? message
        : null);

    super(mainMessage, {
      cause:
        (causeMessage
          ? new Error(causeMessage)
          : null),
    });

    this.fields = fieldNames;
  }
}

export class FieldValueAggregateError extends AggregateError {
  [Symbol.for('hsmusic.aggregate.translucent')] = true;

  constructor(errors, thingConstructor) {
    const constructorText =
      colors.green(thingConstructor.name);

    super(
      errors,
      `Errors processing field values for ${constructorText}`);
  }
}

export class FieldValueError extends Error {
  constructor(field, value, options) {
    const fieldText =
      colors.green(`"${field}"`);

    const valueText =
      inspect(value, {maxStringLength: 40});

    super(
      `Failed to set ${fieldText} field to ${valueText}`,
      options);
  }
}

export class SkippedFieldsSummaryError extends Error {
  constructor(filteredDocument) {
    const entries = Object.entries(filteredDocument);

    const lines =
      entries.map(([field, value]) =>
        ` - ${field}: ` +
        inspect(value, {maxStringLength: 70})
          .split('\n')
          .map((line, index) => index === 0 ? line : `   ${line}`)
          .join('\n'));

    const numFieldsText =
      (entries.length === 1
        ? `1 field`
        : `${entries.length} fields`);

    super(
      colors.bright(colors.yellow(`Altogether, skipped ${numFieldsText}:`)) + '\n' +
      lines.join('\n') + '\n' +
      colors.bright(colors.yellow(`See above errors for details.`)));
  }
}

export class SubdocError extends Error {
  constructor({field, index = null}, setup, options) {
    const fieldText =
      (index === null
        ? colors.green(`"${field}"`)
        : colors.yellow(`#${index + 1}`) + ' in ' +
          colors.green(`"${field}"`));

    const constructorText =
      setup.documentType.name;

    if (options.cause instanceof ProcessDocumentError) {
      options.cause[Symbol.for('hsmusic.aggregate.translucent')] = true;
    }

    super(
      `Errors processing ${constructorText} for ${fieldText} field`,
      options);
  }
}

export class SubdocAggregateError extends AggregateError {
  [Symbol.for('hsmusic.aggregate.translucent')] = true;

  constructor(errors, thingConstructor) {
    const constructorText =
      colors.green(thingConstructor.name);

    super(
      errors,
      `Errors processing subdocuments for ${constructorText}`);
  }
}

export function flipBoolean(value) {
  if (typeof value === 'boolean') {
    return !value;
  } else {
    return value;
  }
}

export function parseDate(date) {
  return new Date(date);
}

export function parseDuration(string) {
  if (typeof string !== 'string') {
    return string;
  }

  const parts = string.split(':').map((n) => parseInt(n));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else {
    return 0;
  }
}

export function parseAlwaysReferenceByDirectory(value) {
  if (value === true) {
    return 'always';
  } else if (value === false) {
    return 'normally';
  } else {
    return value;
  }
}

export function parseTimeIntoDuration(string) {
  // lol
  return parseDuration(string);
}

export const extractAccentRegex =
  /^(?<main>.*?)(?: \((?<accent>.*)\))?$/;

export const extractPrefixAccentRegex =
  /^(?:\((?<accent>.*)\) )?(?<main>.*?)$/;

export const asNameRegex =
  /^as (?<name>\S.+?)(?:(?<=\S)[,:] | +- |$)(?: *(?<annotation>.*))?$/;

// TODO: Should this fit better within actual YAML loading infrastructure??
export function parseArrayEntries(entries, ...args) {
  const [opts, mapFn] =
    (typeof args[0] === 'object'
      ? [args[0], args[1]]
      : [{}, args[0]]);

  const {
    flatMap = false,
  } = opts;

  // If this isn't something we can parse, just return it as-is.
  // The Thing object's validators will handle the data error better
  // than we're able to here.
  if (!Array.isArray(entries)) {
    return entries;
  }

  // If the array is REALLY ACTUALLY empty (it's represented in YAML
  // as literally an empty []), that's something we want to reflect.
  if (empty(entries)) {
    return entries;
  }

  const nonNullEntries =
    entries.filter(value => value !== null);

  // On the other hand, if the array only contains null, it's just
  // a placeholder, so skip over the field like it's not actually
  // been put there yet.
  if (empty(nonNullEntries)) {
    return null;
  }

  if (opts.flatMap) {
    return nonNullEntries.flatMap(mapFn);
  } else {
    return nonNullEntries.map(mapFn);
  }
}

export function parseContributors(entries) {
  return parseArrayEntries(entries, item => {
    if (typeof item === 'object' && item['Who'])
      return {
        artist: item['Who'],
        artistText: item['As'] ?? null,
        annotation: item['What'] ?? null,
      };

    if (typeof item === 'object' && item['Artist'])
      return {
        artist: item['Artist'],
        artistText: item['Artist Text'] ?? null,
        annotation: item['Annotation'] ?? null,

        countInContributionTotals: item['Count In Contribution Totals'] ?? null,
        countInDurationTotals: item['Count In Duration Totals'] ?? null,
      };

    if (typeof item !== 'string') return item;

    let match;

    match = item.match(extractAccentRegex);
    if (!match) return item;

    const {accent} = match.groups;

    let artist = match.groups.main;
    let artistText = null;
    let annotation = null;

    if (accent) {
      match = accent.match(asNameRegex);
      if (match) {
        artistText = match.groups.name;
        annotation = match.groups.annotation ?? null;
      } else {
        annotation = accent;
      }
    }

    return {artist, artistText, annotation};
  });
}

export function parseURLs(entries) {
  return parseArrayEntries(entries, item => {
    if (typeof item === 'object' && item['URL'])
      return {
        url: item['URL'],
        annotation: item['Annotation'] ?? null,
      };

    if (typeof item !== 'string') return item;

    let bypassValidation, restOfItem;
    if (item.endsWith(' (URL OK!!)')) {
      bypassValidation = true;
      restOfItem = item.slice(0, -' (URL OK!!)'.length);
    } else {
      bypassValidation = false;
      restOfItem = item;
    }

    const match = restOfItem.match(extractAccentRegex);
    if (!match) return item;

    return {
      url: match.groups.main,
      annotation: match.groups.accent,
      bypassValidation,
    };
  });
}

export function parseExcludingURLs(value) {
  if (typeof value === 'boolean') {
    switch (value) {
      case true: return 'generic';
      case false: return false;
      // False is for nullifying an inherited reason for exclusion.
    }
  }

  if (typeof value === 'string') {
    switch (value) {
      case 'paid bonus tracks': return 'paid bonus track';
      default: return value;
    }
  }

  return value;
}

export function parseAdditionalFilesEntries(thingClass, entries, {subdoc}) {
  return parseArrayEntries(entries, item => {
    if (typeof item !== 'object') return item;

    return subdoc(thingClass, item, {bindInto: 'thing'});
  });
}

export function parseAdditionalFiles(entries, {subdoc, MiscellaneousAdditionalFile}) {
  return parseAdditionalFilesEntries(MiscellaneousAdditionalFile, entries, {subdoc});
}

export function parseMidiProjectFiles(entries, {subdoc, MidiProjectFile}) {
  return parseAdditionalFilesEntries(MidiProjectFile, entries, {subdoc});
}

export function parseSheetMusicFiles(entries, {subdoc, SheetMusicFile}) {
  return parseAdditionalFilesEntries(SheetMusicFile, entries, {subdoc});
}

export function parseAdditionalNames(entries, {subdoc, AdditionalName}) {
  return parseArrayEntries(entries, item => {
    if (typeof item === 'object') {
      return subdoc(AdditionalName, item, {bindInto: 'thing'});
    }

    if (typeof item !== 'string') return item;

    const match = item.match(extractAccentRegex);
    if (!match) return item;

    const document = {
      ['Name']: match.groups.main,
      ['Annotation']: match.groups.accent ?? null,
    };

    return subdoc(AdditionalName, document, {bindInto: 'thing'});
  });
}

export function parseMusicVideos(entries, {subdoc, MusicVideo}) {
  return parseArrayEntries(entries, item => {
    if (typeof item !== 'object') return item;

    return subdoc(MusicVideo, item, {bindInto: 'thing'});
  });
}

export function parseSerieses(entries, {subdoc, Series}) {
  return parseArrayEntries(entries, item => {
    if (typeof item !== 'object') return item;

    return subdoc(Series, item, {bindInto: 'group'});
  });
}

export function parseWallpaperParts(entries) {
  return parseArrayEntries(entries, item => {
    if (typeof item !== 'object') return item;

    return {
      asset:
        (item['Asset'] === 'none'
          ? null
          : item['Asset'] ?? null),

      style: item['Style'] ?? null,
    };
  });
}

export function parseDimensions(string) {
  // It's technically possible to pass an array like [30, 40] through here.
  // That's not really an issue because if it isn't of the appropriate shape,
  // the Thing object's validators will handle the error.
  if (typeof string !== 'string') {
    return string;
  }

  const parts = string.split(/[x,* ]+/g);

  if (parts.length !== 2) {
    throw new Error(`Invalid dimensions: ${string} (expected "width & height")`);
  }

  const nums = parts.map((part) => Number(part.trim()));

  if (nums.includes(NaN)) {
    throw new Error(`Invalid dimensions: ${string} (couldn't parse as numbers)`);
  }

  return nums;
}

export const contributionPresetYAMLSpec = [
  {from: 'Album', to: 'album', fields: [
    {from: 'Artists', to: 'artistContribs'},
  ]},

  {from: 'Flash', to: 'flash', fields: [
    {from: 'Contributors', to: 'contributorContribs'},
  ]},

  {from: 'Track', to: 'track', fields: [
    {from: 'Artists', to: 'artistContribs'},
    {from: 'Contributors', to: 'contributorContribs'},
  ]},
];

export function parseContributionPresetContext(context) {
  if (!Array.isArray(context)) {
    return context;
  }

  const [target, ...fields] = context;

  const targetEntry =
    contributionPresetYAMLSpec
      .find(({from}) => from === target);

  if (!targetEntry) {
    return context;
  }

  const properties =
    fields.map(field => {
      const fieldEntry =
        targetEntry.fields
          .find(({from}) => from === field);

      if (!fieldEntry) return field;

      return fieldEntry.to;
    });

  return [targetEntry.to, ...properties];
}

export function parseContributionPresets(list) {
  if (!Array.isArray(list)) return list;

  return list.map(item => {
    if (typeof item !== 'object') return item;

    return {
      annotation:
        item['Annotation'] ?? null,

      context:
        parseContributionPresetContext(
          item['Context'] ?? null),

      countInContributionTotals:
        item['Count In Contribution Totals'] ?? null,

      countInDurationTotals:
        item['Count In Duration Totals'] ?? null,
    };
  });
}

export function parseAnnotatedReferences(entries, {
  referenceField = 'References',
  annotationField = 'Annotation',
  referenceProperty = 'reference',
  annotationProperty = 'annotation',
} = {}) {
  return parseArrayEntries(entries, item => {
    if (typeof item === 'object' && item[referenceField])
      return {
        [referenceProperty]: item[referenceField],
        [annotationProperty]: item[annotationField] ?? null,
      };

    if (typeof item !== 'string') return item;

    const match = item.match(extractAccentRegex);
    if (!match)
      return {
        [referenceProperty]: item,
        [annotationProperty]: null,
      };

    return {
      [referenceProperty]: match.groups.main,
      [annotationProperty]: match.groups.accent ?? null,
    };
  });
}

export function parseArtwork({
  single = false,
  thingProperty = null,
  dimensionsFromThingProperty = null,
  fileExtensionFromThingProperty = null,
  dateFromThingProperty = null,
  artistContribsFromThingProperty = null,
  artistContribsArtistProperty = null,
  artTagsFromThingProperty = null,
  referencedArtworksFromThingProperty = null,
}) {
  const provide = {
    thingProperty,
    dimensionsFromThingProperty,
    fileExtensionFromThingProperty,
    dateFromThingProperty,
    artistContribsFromThingProperty,
    artistContribsArtistProperty,
    artTagsFromThingProperty,
    referencedArtworksFromThingProperty,
  };

  const parseSingleEntry = (entry, {subdoc, Artwork}) =>
    subdoc(Artwork, entry, {bindInto: 'thing', provide});

  const transform = (value, ...args) =>
    (Array.isArray(value)
      ? value.map(entry => parseSingleEntry(entry, ...args))
   : single
      ? parseSingleEntry(value, ...args)
      : [parseSingleEntry(value, ...args)]);

  transform.provide = provide;

  return transform;
}

export function parseContentEntriesFromSourceText(thingClass, sourceText, {subdoc}) {
  function map(matchEntry) {
    let artistText = null, artistReferences = null;

    if (matchEntry.artists) {
      const artistTextNodes =
        Array.from(
          splitContentNodesAround(
            parseContentNodes(matchEntry.artists),
            /\|/g));

      const separatorIndices =
        artistTextNodes
          .filter(node => node.type === 'separator')
          .map(node => artistTextNodes.indexOf(node));

      if (empty(separatorIndices)) {
        if (artistTextNodes.length === 1 && artistTextNodes[0].type === 'text') {
          artistReferences = matchEntry.artists;
        } else {
          artistText = matchEntry.artists;
        }
      } else {
        const firstSeparatorIndex =
          separatorIndices.at(0);

        const secondSeparatorIndex =
          separatorIndices.at(1) ??
          artistTextNodes.length;

        artistReferences =
          matchEntry.artists.slice(
            artistTextNodes.at(0).i,
            artistTextNodes.at(firstSeparatorIndex - 1).iEnd);

        artistText =
          matchEntry.artists.slice(
            artistTextNodes.at(firstSeparatorIndex).iEnd,
            artistTextNodes.at(secondSeparatorIndex - 1).iEnd);
      }

      if (artistReferences) {
        artistReferences =
          artistReferences
            .split(',')
            .map(ref => ref.trim());
      }
    }

    return {
      'Artists':
        artistReferences,

      'Artist Text':
        artistText,

      'Annotation':
        matchEntry.annotation,

      'Date':
        matchEntry.date,

      'Second Date':
        matchEntry.secondDate,

      'Date Kind':
        matchEntry.dateKind,

      'Access Date':
        matchEntry.accessDate,

      'Access Kind':
        matchEntry.accessKind,

      'Body':
        matchEntry.body,
    };
  }

  const documents =
    Array.from(matchContentEntries(sourceText))
      .map(matchEntry =>
        withEntries(
          map(matchEntry),
          entries => entries
            .filter(([key, value]) =>
              value !== undefined &&
              value !== null)));

  const subdocs =
    documents.map(document =>
      subdoc(thingClass, document, {bindInto: 'thing'}));

  return subdocs;
}

export function parseContentEntries(thingClass, value, {subdoc}) {
  if (typeof value === 'string') {
    return parseContentEntriesFromSourceText(thingClass, value, {subdoc});
  } else if (Array.isArray(value)) {
    return value.map(doc => subdoc(thingClass, doc, {bindInto: 'thing'}));
  } else {
    return value;
  }
}

export function parseCommentary(value, {subdoc, CommentaryEntry}) {
  return parseContentEntries(CommentaryEntry, value, {subdoc});
}

export function parseCreditingSources(value, {subdoc, CreditingSourcesEntry}) {
  return parseContentEntries(CreditingSourcesEntry, value, {subdoc});
}

export function parseReferencingSources(value, {subdoc, ReferencingSourcesEntry}) {
  return parseContentEntries(ReferencingSourcesEntry, value, {subdoc});
}

export function parseLyrics(value, {subdoc, LyricsEntry}) {
  if (typeof value === 'string' && !/^(@@|<i>.*:<\/i>)/m.test(value)) {
    const document = {'Body': value};

    return [subdoc(LyricsEntry, document, {bindInto: 'thing'})];
  }

  return parseContentEntries(LyricsEntry, value, {subdoc});
}

export function parseArtistAliases(value, {subdoc, Artist}) {
  return parseArrayEntries(value, item => {
    const config = {
      bindInto: 'aliasedArtist',
      provide: {isAlias: true},
    };

    if (typeof item === 'string') {
      return subdoc(Artist, {'Artist': item}, config);
    } else if (typeof item === 'object' && !Array.isArray(item)) {
      if (item['Name']) {
        const clone = {...item};
        clone['Artist'] = item['Name'];
        delete clone['Name'];
        return subdoc(Artist, clone, config);
      } else {
        return subdoc(Artist, item, config);
      }
    } else {
      return item;
    }
  });
}

export function parseFeaturedMotifs(value, {subdoc, FeaturedMotifConnection}) {
  return parseArrayEntries(value, {flatMap: true}, item => {
    let documents = [item];

    if (typeof item === 'string') {
      const match = item.match(extractPrefixAccentRegex);
      if (!match) return item;

      const accentParts = match.groups.accent?.split(', ') ?? [];

      const timeRanges =
        accentParts
          .map(part => part.match(timeRangeRegex)?.groups)
          .filter(Boolean)
          .map(groups => ({
            start: groups.time1,
            end: groups.time2,
          }));

      const basicDocument = {
        'Motif':
          match.groups.main,
      };

      if (empty(timeRanges)) {
        documents = [basicDocument];
      } else {
        documents = timeRanges.map(range => ({
          ...basicDocument,

          'Start Time':
            range.start,

          'End Time':
            range.end,
        }));
      }
    }

    return documents.map(document =>
      subdoc(FeaturedMotifConnection, document, {bindInto: 'track'}));
  });
}

export const durationRegexRaw =
  String.raw`(?:(?<hour>\d\d?):)?(?<minute>\d\d?):(?<second>\d\d)`;

export const timeRangeRegexRaw =
  '(?<time1>' + durationRegexRaw.replace(/hour|minute|second/g, '$&1') + ')' +
  '-' +
  '(?<time2>' + durationRegexRaw.replace(/hour|minute|second/g, '$&2') + ')';

export const duragionRegex =
  new RegExp('^' + durationRegexRaw + '$');

export const timeRangeRegex =
  new RegExp('^' + timeRangeRegexRaw + '$');

// documentModes: Symbols indicating sets of behavior for loading and processing
// data files.
export const documentModes = {
  // onePerFile: One document per file. Expects files array (or function) and
  // processDocument function. Obviously, each specified data file should only
  // contain one YAML document (an error will be thrown otherwise). Calls save
  // with an array of processed documents (wiki objects).
  onePerFile: Symbol('Document mode: onePerFile'),

  // headerAndEntries: One or more documents per file; the first document is
  // treated as a "header" and represents data which pertains to all following
  // "entry" documents. Expects files array (or function) and
  // processHeaderDocument and processEntryDocument functions. Calls save with
  // an array of {header, entries} objects.
  //
  // Please note that the final results loaded from each file may be "missing"
  // data objects corresponding to entry documents if the processEntryDocument
  // function throws on any entries, resulting in partial data provided to
  // save() - errors will be caught and thrown in the final buildSteps
  // aggregate. However, if the processHeaderDocument function fails, all
  // following documents in the same file will be ignored as well (i.e. an
  // entire file will be excempt from the save() function's input).
  headerAndEntries: Symbol('Document mode: headerAndEntries'),

  // allInOne: One or more documents, all contained in one file. Expects file
  // string (or function) and processDocument function. Calls save with an
  // array of processed documents (wiki objects).
  allInOne: Symbol('Document mode: allInOne'),

  // allTogether: One or more documens, spread across any number of files.
  // Expects files array (or function) and processDocument function.
  // Calls save with an array of processed documents (wiki objects) - this is
  // a flat array, *not* an array of the documents processed from *each* file.
  allTogether: Symbol('Document mode: allTogether'),

  // oneDocumentTotal: Just a single document, represented in one file.
  // Expects file string (or function) and processDocument function. Calls
  // save with the single processed wiki document (data object).
  //
  // Please note that if the single document fails to process, the save()
  // function won't be called at all, generally resulting in an altogether
  // missing property from the global wikiData object. This should be caught
  // and handled externally.
  oneDocumentTotal: Symbol('Document mode: oneDocumentTotal'),
};

// dataSteps: Top-level array of "steps" for loading YAML document files.
//
// title:
//   Name of the step (displayed in build output)
//
// documentMode:
//   Symbol which indicates by which "mode" documents from data files are
//   loaded and processed. See documentModes export.
//
// file, files:
//   String or array of strings which are paths to YAML data files, or a
//   function which returns the above (may be async). All paths are appended to
//   the global dataPath provided externally (e.g. HSMUSIC_DATA env variable).
//   Which to provide (file or files) depends on documentMode. If this is a
//   function, it will be provided with dataPath (e.g. so that a sub-path may be
//   readdir'd), but don't path.join(dataPath) the returned value(s) yourself -
//   this will be done automatically.
//
// processDocument, processHeaderDocument, processEntryDocument:
//   Functions which take a YAML document and return an actual wiki data object;
//   all actual conversion between YAML and wiki data happens here. Which to
//   provide (one or a combination) depend on documentMode.
//
// save:
//   Function which takes all documents processed (now as wiki data objects) and
//   actually applies them to a global wiki data object, for use in page
//   generation and other behavior. Returns an object to be assigned over the
//   global wiki data object (so specify any new properties here). This is also
//   the place to perform any final post-processing on data objects (linking
//   them to each other, setting additional properties, etc). Input argument
//   format depends on documentMode.
//
export function getAllDataSteps() {
  try {
    thingConstructors;
  } catch {
    throw new Error(`Thing constructors aren't ready yet, can't get all data steps`);
  }

  const steps = [];

  for (const getSpecFn of Object.values(fileLoadingSpecs)) {
    steps.push(getSpecFn({
      documentModes,
      thingConstructors,
    }));
  }

  sortByName(steps, {getName: step => step.title});

  return steps;
}

export async function getFilesFromDataStep(dataStep, {dataPath}) {
  const {documentMode} = dataStep;

  switch (documentMode) {
    case documentModes.allInOne:
    case documentModes.oneDocumentTotal: {
      if (!dataStep.file) {
        throw new Error(`Expected 'file' property for ${documentMode.toString()}`);
      }

      const localFile =
        (typeof dataStep.file === 'function'
          ? await dataStep.file(dataPath)
          : dataStep.file);

      const fileUnderDataPath =
        path.join(dataPath, localFile);

      const statResult =
        await stat(fileUnderDataPath).then(
          () => true,
          error => {
            if (error.code === 'ENOENT') {
              return false;
            } else {
              throw error;
            }
          });

      if (statResult) {
        return [fileUnderDataPath];
      } else {
        return [];
      }
    }

    case documentModes.allTogether:
    case documentModes.headerAndEntries:
    case documentModes.onePerFile: {
      if (!dataStep.files) {
        throw new Error(`Expected 'files' property for ${documentMode.toString()}`);
      }

      const localFiles =
        (typeof dataStep.files === 'function'
          ? await dataStep.files(dataPath).then(
              files => files,
              error => {
                if (error.code === 'ENOENT') {
                  return [];
                } else {
                  throw error;
                }
              })
          : dataStep.files);

      const filesUnderDataPath =
        localFiles
          .map(file => path.join(dataPath, file));

      return filesUnderDataPath;
    }

    default:
      throw new Error(`Unknown document mode ${documentMode.toString()}`);
  }
}

export async function loadYAMLDocumentsFromFile(file) {
  let contents;
  try {
    contents = await readFile(file, 'utf-8');
  } catch (caughtError) {
    throw new Error(`Failed to read data file`, {cause: caughtError});
  }

  let documents;
  try {
    documents = yaml.loadAll(contents);
  } catch (caughtError) {
    throw new Error(`Failed to parse valid YAML`, {cause: caughtError});
  }

  const aggregate = openAggregate({
    message: `Found blank documents - check for extra '${colors.cyan(`---`)}'`,
  });

  const filteredDocuments =
    documents
      .filter(doc => doc !== null);

  if (filteredDocuments.length !== documents.length) {
    const blankIndexRangeInfo =
      documents
        .map((doc, index) => [doc, index])
        .filter(([doc]) => doc === null)
        .map(([doc, index]) => index)
        .reduce((accumulator, index) => {
          if (accumulator.length === 0) {
            return [[index, index]];
          }
          const current = accumulator.at(-1);
          const rest = accumulator.slice(0, -1);
          if (current[1] === index - 1) {
            return rest.concat([[current[0], index]]);
          } else {
            return accumulator.concat([[index, index]]);
          }
        }, [])
        .map(([start, end]) => ({
          start,
          end,
          count: end - start + 1,
          previous: atOffset(documents, start, -1),
          next: atOffset(documents, end, +1),
        }));

    for (const {start, end, count, previous, next} of blankIndexRangeInfo) {
      const parts = [];

      if (count === 1) {
        const range = `#${start + 1}`;
        parts.push(`${count} document (${colors.yellow(range)}), `);
      } else {
        const range = `#${start + 1}-${end + 1}`;
        parts.push(`${count} documents (${colors.yellow(range)}), `);
      }

      if (previous === null) {
        parts.push(`at start of file`);
      } else if (next === null) {
        parts.push(`at end of file`);
      } else {
        const previousDescription = Object.entries(previous).at(0).join(': ');
        const nextDescription = Object.entries(next).at(0).join(': ');
        parts.push(`between "${colors.cyan(previousDescription)}" and "${colors.cyan(nextDescription)}"`);
      }

      aggregate.push(new Error(parts.join('')));
    }
  }

  return {result: filteredDocuments, aggregate};
}

// Mapping from dataStep (spec) object each to a sub-map, from thing class to
// processDocument function.
const processDocumentFns = new WeakMap();

export function processThingsFromDataStep(documents, dataStep) {
  let submap;
  if (processDocumentFns.has(dataStep)) {
    submap = processDocumentFns.get(dataStep);
  } else {
    submap = new Map();
    processDocumentFns.set(dataStep, submap);
  }

  function processDocument(document, thingClassOrFn) {
    const thingClass =
      (thingClassOrFn.prototype instanceof Thing
        ? thingClassOrFn
        : thingClassOrFn(document));

    let fn;
    if (submap.has(thingClass)) {
      fn = submap.get(thingClass);
    } else {
      if (typeof thingClass !== 'function') {
        throw new Error(`Expected a thing class, got ${typeAppearance(thingClass)}`);
      }

      if (!(thingClass.prototype instanceof Thing)) {
        throw new Error(`Expected a thing class, got ${thingClass.name}`);
      }

      const spec = thingClass[Thing.yamlDocumentSpec];

      if (!spec) {
        throw new Error(`Class "${thingClass.name}" doesn't specify Thing.yamlDocumentSpec`);
      }

      fn = makeProcessDocument(thingClass, {...spec, processDocument});
      submap.set(thingClass, fn);
    }

    return fn(document);
  }

  const {documentMode} = dataStep;

  switch (documentMode) {
    case documentModes.allInOne:
    case documentModes.allTogether: {
      const things = [];
      const flat = [];
      const wikiData = makeEmptyWikiData();
      const aggregate = openAggregate({message: `Errors processing documents`});

      documents.forEach(
        decorateErrorWithIndex((document, index) => {
          const {result, aggregate: subAggregate} =
            processDocument(document, dataStep.documentThing);

          result.thing[Thing.yamlSourceDocument] = document;
          result.thing[Thing.yamlSourceDocumentPlacement] =
            [documentModes.allInOne, index];

          things.push(result.thing);
          flat.push(...result.flat);
          pushWikiData(wikiData, result.wikiData);

          aggregate.call(subAggregate.close);
        }));

      return {
        aggregate,
        result: {
          network: things,
          flat: things,
          file: things,
          wikiData,
        },
      };
    }

    case documentModes.oneDocumentTotal: {
      if (documents.length > 1)
        throw new Error(`Only expected one document to be present, got ${documents.length}`);

      const {result, aggregate} =
        processDocument(documents[0], dataStep.documentThing);

      result.thing[Thing.yamlSourceDocument] = documents[0];
      result.thing[Thing.yamlSourceDocumentPlacement] =
        [documentModes.oneDocumentTotal];

      return {
        aggregate,
        result: {
          network: result.thing,
          flat: result.flat,
          file: [result.thing],
          wikiData: result.wikiData,
        },
      };
    }

    case documentModes.headerAndEntries: {
      const headerDocument = documents[0];
      const entryDocuments = documents.slice(1).filter(Boolean);

      if (!headerDocument)
        throw new Error(`Missing header document (empty file or erroneously starting with "---"?)`);

      const aggregate = openAggregate({message: `Errors processing documents`});
      const wikiData = makeEmptyWikiData();

      const {result: headerResult, aggregate: headerAggregate} =
        processDocument(headerDocument, dataStep.headerDocumentThing);

      headerResult.thing[Thing.yamlSourceDocument] = headerDocument;
      headerResult.thing[Thing.yamlSourceDocumentPlacement] =
        [documentModes.headerAndEntries, 'header'];

      pushWikiData(wikiData, headerResult.wikiData);

      try {
        headerAggregate.close();
      } catch (caughtError) {
        caughtError.message = `(${colors.yellow(`header`)}) ${caughtError.message}`;
        aggregate.push(caughtError);
      }

      const entryResults = [];

      for (const [index, entryDocument] of entryDocuments.entries()) {
        const {result: entryResult, aggregate: entryAggregate} =
          processDocument(entryDocument, dataStep.entryDocumentThing);

        entryResult.thing[Thing.yamlSourceDocument] = entryDocument;
        entryResult.thing[Thing.yamlSourceDocumentPlacement] =
          [documentModes.headerAndEntries, 'entry', index];

        entryResults.push(entryResult);
        pushWikiData(wikiData, entryResult.wikiData);

        try {
          entryAggregate.close();
        } catch (caughtError) {
          caughtError.message = `(${colors.yellow(`entry #${index + 1}`)}) ${caughtError.message}`;
          aggregate.push(caughtError);
        }
      }

      return {
        aggregate,
        result: {
          network: {
            header: headerResult.thing,
            entries: entryResults.map(result => result.thing),
          },

          flat: headerResult.flat.concat(entryResults.flatMap(result => result.flat)),
          file: [headerResult.thing, ...entryResults.map(result => result.thing)],

          wikiData,
        },
      };
    }

    case documentModes.onePerFile: {
      if (documents.length > 1)
        throw new Error(`Only expected one document to be present per file, got ${documents.length} here`);

      if (empty(documents) || !documents[0])
        throw new Error(`Expected a document, this file is empty`);

      const {result, aggregate} =
        processDocument(documents[0], dataStep.documentThing);

      result.thing[Thing.yamlSourceDocument] = documents[0];
      result.thing[Thing.yamlSourceDocumentPlacement] =
        [documentModes.onePerFile];

      return {
        aggregate,
        result: {
          network: result.thing,
          flat: result.flat,
          file: [result.thing],
          wikiData: result.wikiData,
        },
      };
    }

    default:
      throw new Error(`Unknown document mode ${documentMode.toString()}`);
  }
}

export function decorateErrorWithFileFromDataPath(fn, {dataPath}) {
  return decorateErrorWithAnnotation(fn,
    (caughtError, firstArg) =>
      annotateErrorWithFile(
        caughtError,
        path.relative(
          dataPath,
          (typeof firstArg === 'object'
            ? firstArg.file
            : firstArg))));
}

// Loads a list of files for each data step, and a list of documents
// for each file.
export async function loadYAMLDocumentsFromDataSteps(dataSteps, {dataPath}) {
  const aggregate =
    openAggregate({
      message: `Errors loading data files`,
      translucent: true,
    });

  const fileLists =
    await Promise.all(
      dataSteps.map(dataStep =>
        getFilesFromDataStep(dataStep, {dataPath})));

  const filePromises =
    fileLists
      .map(files => files
        .map(file =>
          loadYAMLDocumentsFromFile(file).then(
            ({result, aggregate}) => {
              const close =
                decorateErrorWithFileFromDataPath(aggregate.close, {dataPath});

              aggregate.close = () =>
                close({file});

              return {result, aggregate};
            },
            (error) => {
              const aggregate = {};

              annotateErrorWithFile(error, path.relative(dataPath, file));

              aggregate.close = () => {
                throw error;
              };

              return {result: [], aggregate};
            })));

  const fileListPromises =
    filePromises
      .map(filePromises => Promise.all(filePromises));

  const dataStepPromises =
    stitchArrays({
      dataStep: dataSteps,
      fileListPromise: fileListPromises,
    }).map(async ({dataStep, fileListPromise}) =>
        openAggregate({
          message: `Errors loading data files for data step: ${colors.bright(dataStep.title)}`,
          translucent: true,
        }).contain(await fileListPromise));

  const documentLists =
    aggregate
      .receive(await Promise.all(dataStepPromises));

  return {aggregate, result: {documentLists, fileLists}};
}

// Loads a list of things from a list of documents for each file
// for each data step. Nesting!
export async function processThingsFromDataSteps(documentLists, fileLists, dataSteps, {dataPath}) {
  const aggregate =
    openAggregate({
      message: `Errors processing documents in data files`,
      translucent: true,
    });

  const filePromises =
    stitchArrays({
      dataStep: dataSteps,
      files: fileLists,
      documentLists: documentLists,
    }).map(({dataStep, files, documentLists}) =>
        stitchArrays({
          file: files,
          documents: documentLists,
        }).map(({file, documents}) => {
            const {result, aggregate} =
              processThingsFromDataStep(documents, dataStep);

            for (const thing of result.file) {
              thing[Thing.yamlSourceFilename] =
                path.relative(dataPath, file)
                  .split(path.sep)
                  .join(path.posix.sep);
            }

            const close = decorateErrorWithFileFromDataPath(aggregate.close, {dataPath});
            aggregate.close = () => close({file});

            return {result, aggregate};
          }));

  const fileListPromises =
    filePromises
      .map(filePromises => Promise.all(filePromises));

  const dataStepPromises =
    stitchArrays({
      dataStep: dataSteps,
      fileListPromise: fileListPromises,
    }).map(async ({dataStep, fileListPromise}) =>
        openAggregate({
          message: `Errors loading data files for data step: ${colors.bright(dataStep.title)}`,
          translucent: true,
        }).contain(await fileListPromise));

  const results =
    aggregate
      .receive(await Promise.all(dataStepPromises));

  return {aggregate, result: results};
}

// Runs a data step's connect() function, if present, with representations
// of the results from the YAML files, called "networks" - one network and
// one call to .connect() per YAML file - in order to form data connections
// (direct links) between related objects within a file.
export function connectThingsFromDataStep(results, dataStep) {
  const {documentMode} = dataStep;

  switch (documentMode) {
    case documentModes.oneDocumentTotal:
    case documentModes.onePerFile: {
      // These results are never connected.
      return;
    }

    case documentModes.allInOne:
    case documentModes.allTogether:
    case documentModes.headerAndEntries: {
      for (const result of results) {
        dataStep.connect?.(result.network);
      }

      break;
    }

    default:
      throw new Error(`Invalid documentMode: ${documentMode.toString()}`);
  }
}

export function connectThingsFromDataSteps(processThingResultLists, dataSteps) {
  const aggregate =
    openAggregate({
      message: `Errors connecting things from data files`,
      translucent: true,
    });

  stitchArrays({
    dataStep: dataSteps,
    processThingResults: processThingResultLists,
  }).forEach(({dataStep, processThingResults}) => {
      try {
        connectThingsFromDataStep(processThingResults, dataStep);
      } catch (caughtError) {
        const error = new Error(
          `Error connecting things for data step: ${colors.bright(dataStep.title)}`,
          {cause: caughtError});

        error[Symbol.for('hsmusic.aggregate.translucent')] = true;

        aggregate.push(error);
      }
    });

  return {result: null, aggregate};
}

export function makeWikiDataFromDataSteps(processThingResultLists, _dataSteps) {
  const wikiData = makeEmptyWikiData();

  for (const result of processThingResultLists.flat(2)) {
    pushWikiData(wikiData, result.wikiData);
  }

  const scanForConstituted =
    processThingResultLists.flat(2).flatMap(result => result.flat);

  const exists = new Set(scanForConstituted);

  while (scanForConstituted.length) {
    const scanningThing = scanForConstituted.pop();

    for (const key of scanningThing.constructor[Thing.constitutibleProperties] ?? []) {
      const maybeConstitutedThings =
        (Array.isArray(scanningThing[key])
          ? scanningThing[key]
       : scanningThing[key]
          ? [scanningThing[key]]
          : []);

      for (const thing of maybeConstitutedThings) {
        if (exists.has(thing)) continue;
        exists.add(thing);

        if (thing.constructor[Thing.wikiData]) {
          pushWikiData(wikiData, {[thing.constructor[Thing.wikiData]]: [thing]});
        }

        scanForConstituted.push(thing);
      }
    }
  }

  return wikiData;
}

export async function loadAndProcessDataDocuments(dataSteps, {dataPath}) {
  const aggregate =
    openAggregate({
      message: `Errors processing data files`,
    });

  const {documentLists, fileLists} =
    aggregate.receive(
      await loadYAMLDocumentsFromDataSteps(dataSteps, {dataPath}));

  const processThingResultLists =
    aggregate.receive(
      await processThingsFromDataSteps(documentLists, fileLists, dataSteps, {dataPath}));

  aggregate.receive(
    connectThingsFromDataSteps(processThingResultLists, dataSteps));

  const wikiData =
    makeWikiDataFromDataSteps(processThingResultLists, dataSteps);

  return {aggregate, result: wikiData};
}

// Data linking! Basically, provide (portions of) wikiData to the Things which
// require it - they'll expose dynamically computed properties as a result (many
// of which are required for page HTML generation and other expected behavior).
export function linkWikiDataArrays(wikiData, {bindFind, bindReverse}) {
  const linkWikiDataSpec = new Map([
    // entries must be present here even without any properties to explicitly
    // link if the 'find' or 'reverse' properties will be implicitly linked

    ['albumData', [
      'artworkData',
      'wikiInfo',
    ]],

    ['artTagData', [/* reverse */]],

    ['artistData', [/* find, reverse */]],

    ['artworkData', ['artworkData']],

    ['commentaryData', [/* find */]],

    ['connectionData', [/* find and/or reverse */]],

    ['creditingSourceData', [/* find */]],

    ['flashData', [
      'wikiInfo',
    ]],

    ['flashActData', ['flashActData']],

    ['flashSideData', [/* find */]],

    ['groupData', [/* find, reverse */]],

    ['groupCategoryData', [/* find */]],

    ['homepageLayout.sections.rows', [/* find */]],

    ['lyricsData', [/* find */]],

    ['midiProjectFileData', [/* find */]],

    ['miscellaneousAdditionalFileData', [/* find */]],

    ['motifData', [/* reverse */]],

    ['musicVideoData', [/* find */]],

    ['referencingSourceData', [/* find */]],

    ['seriesData', [/* find */]],

    ['sheetMusicFileData', [/* find */]],

    ['trackData', [
      'artworkData',
      'wikiInfo',
    ]],

    ['trackSectionData', [/* reverse */]],

    ['wikiInfo', [/* find */]],
  ]);

  const constructorHasFindMap = new Map();
  const constructorHasReverseMap = new Map();

  const boundFind = bindFind(wikiData);
  const boundReverse = bindReverse(wikiData);

  for (const [thingDataProp, keys] of linkWikiDataSpec.entries()) {
    const thingData = getNestedProp(wikiData, thingDataProp);
    const things =
      (Array.isArray(thingData)
        ? thingData.flat(Infinity)
        : [thingData]);

    for (const thing of things) {
      if (thing === undefined) continue;
      if (thing === null) continue;

      let hasFind;
      if (constructorHasFindMap.has(thing.constructor)) {
        hasFind = constructorHasFindMap.get(thing.constructor);
      } else {
        hasFind = 'find' in thing;
        constructorHasFindMap.set(thing.constructor, hasFind);
      }

      if (hasFind) {
        thing.find = boundFind;
      }

      let hasReverse;
      if (constructorHasReverseMap.has(thing.constructor)) {
        hasReverse = constructorHasReverseMap.get(thing.constructor);
      } else {
        hasReverse = 'reverse' in thing;
        constructorHasReverseMap.set(thing.constructor, hasReverse);
      }

      if (hasReverse) {
        thing.reverse = boundReverse;
      }

      for (const key of keys) {
        if (!(key in wikiData)) continue;

        thing[key] = wikiData[key];
      }
    }
  }
}

export function sortWikiDataArrays(dataSteps, wikiData, {bindFind, bindReverse}) {
  for (const [key, value] of Object.entries(wikiData)) {
    if (!Array.isArray(value)) continue;
    wikiData[key] = value.slice();
  }

  for (const step of dataSteps) {
    if (!step.sort) continue;
    step.sort(wikiData);
  }

  // Re-link data arrays, so that every object has the new, sorted versions.
  // Note that the sorting step deliberately creates new arrays (mutating
  // slices instead of the original arrays) - this is so that the object
  // caching system understands that it's working with a new ordering.
  // We still need to actually provide those updated arrays over again!
  linkWikiDataArrays(wikiData, {bindFind, bindReverse});
}

// Utility function for loading all wiki data from the provided YAML data
// directory (e.g. the root of the hsmusic-data repository). This doesn't
// provide much in the way of customization; it's meant to be used more as
// a boilerplate for more specialized output, or as a quick start in utilities
// where reporting info about data loading isn't as relevant as during the
// main wiki build process.
export async function quickLoadAllFromYAML(dataPath, {
  find,
  bindFind,
  bindReverse,
  getAllFindSpecs,

  showAggregate: customShowAggregate = showAggregate,
}) {
  const showAggregate = customShowAggregate;

  const dataSteps = getAllDataSteps();

  let wikiData;

  {
    const {aggregate, result} = await loadAndProcessDataDocuments(dataSteps, {dataPath});

    wikiData = result;

    try {
      aggregate.close();
      logInfo`Loaded data without errors. (complete data)`;
    } catch (error) {
      showAggregate(error);
      logWarn`Loaded data with errors. (partial data)`;
    }
  }

  linkWikiDataArrays(wikiData, {bindFind, bindReverse});

  try {
    reportDirectoryErrors(wikiData, {getAllFindSpecs});
    logInfo`No duplicate directories found. (complete data)`;
  } catch (error) {
    showAggregate(error);
    logWarn`Duplicate directories found. (partial data)`;
  }

  try {
    filterReferenceErrors(wikiData, {find, bindFind}).close();
    logInfo`No reference errors found. (complete data)`;
  } catch (error) {
    showAggregate(error);
    logWarn`Reference errors found. (partial data)`;
  }

  try {
    reportContentTextErrors(wikiData, {bindFind});
    logInfo`No content text errors found.`;
  } catch (error) {
    showAggregate(error);
    logWarn`Content text errors found.`;
  }

  sortWikiDataArrays(dataSteps, wikiData, {bindFind, bindReverse});

  return wikiData;
}

export function cruddilyGetAllThings(wikiData) {
  const allThings = [];

  for (const v of Object.values(wikiData)) {
    if (Array.isArray(v)) {
      allThings.push(...v);
    } else {
      allThings.push(v);
    }
  }

  return allThings;
}

export function getThingLayoutForFilename(filename, wikiData) {
  const things =
    cruddilyGetAllThings(wikiData)
      .filter(thing =>
        thing[Thing.yamlSourceFilename] === filename);

  if (empty(things)) {
    return null;
  }

  const allDocumentModes =
    unique(things.map(thing =>
      thing[Thing.yamlSourceDocumentPlacement][0]));

  if (allDocumentModes.length > 1) {
    throw new Error(`More than one document mode for documents from ${filename}`);
  }

  const documentMode = allDocumentModes[0];

  switch (documentMode) {
    case documentModes.allInOne: {
      return {
        documentMode,
        things:
          things.sort((a, b) =>
            a[Thing.yamlSourceDocumentPlacement][1] -
            b[Thing.yamlSourceDocumentPlacement][1]),
      };
    }

    case documentModes.oneDocumentTotal:
    case documentModes.onePerFile: {
      if (things.length > 1) {
        throw new Error(`More than one document for ${filename}`);
      }

      return {
        documentMode,
        thing: things[0],
      };
    }

    case documentModes.headerAndEntries: {
      const headerThings =
        things.filter(thing =>
          thing[Thing.yamlSourceDocumentPlacement][1] === 'header');

      if (headerThings.length > 1) {
        throw new Error(`More than one header document for ${filename}`);
      }

      return {
        documentMode,
        headerThing: headerThings[0] ?? null,
        entryThings:
          things
            .filter(thing =>
              thing[Thing.yamlSourceDocumentPlacement][1] === 'entry')
            .sort((a, b) =>
              a[Thing.yamlSourceDocumentPlacement][2] -
              b[Thing.yamlSourceDocumentPlacement][2]),
      };
    }

    default: {
      return {documentMode};
    }
  }
}

export function flattenThingLayoutToDocumentOrder(layout) {
  switch (layout.documentMode) {
    case documentModes.oneDocumentTotal:
    case documentModes.onePerFile: {
      if (layout.thing) {
        return [0];
      } else {
        return [];
      }
    }

    case documentModes.allInOne: {
      const indices =
        layout.things
          .map(thing => thing[Thing.yamlSourceDocumentPlacement][1]);

      return indices;
    }

    case documentModes.headerAndEntries: {
      const entryIndices =
        layout.entryThings
          .map(thing => thing[Thing.yamlSourceDocumentPlacement][2])
          .map(index => index + 1);

      if (layout.headerThing) {
        return [0, ...entryIndices];
      } else {
        return entryIndices;
      }
    }

    default: {
      throw new Error(`Unknown document mode`);
    }
  }
}

export function* splitDocumentsInYAMLSourceText(sourceText) {
  // Not multiline!
  const dividerRegex = /(?:\r\n|\n|^)-{3,}(?:\r\n|\n|$)/g;

  let previousDivider = '';

  while (true) {
    const {lastIndex} = dividerRegex;
    const match = dividerRegex.exec(sourceText);
    if (match) {
      const nextDivider = match[0];

      yield {
        previousDivider,
        nextDivider,
        text: sourceText.slice(lastIndex, match.index),
      };

      previousDivider = nextDivider;
    } else {
      const nextDivider = '';
      const lineBreak = previousDivider.match(/\r?\n/)?.[0] ?? '';

      yield {
        previousDivider,
        nextDivider,
        text: sourceText.slice(lastIndex).replace(/(?<!\n)$/, lineBreak),
      };

      return;
    }
  }
}

export function recombineDocumentsIntoYAMLSourceText(documents) {
  const dividers =
    unique(
      documents
        .flatMap(d => [d.previousDivider, d.nextDivider])
        .filter(Boolean));

  const divider = dividers[0];

  if (dividers.length > 1) {
    // TODO: Accommodate mixed dividers as best as we can lol
    logWarn`Found multiple dividers in this file, using only ${divider}`;
  }

  let sourceText = '';

  for (const document of documents) {
    if (sourceText) {
      sourceText += divider;
    }

    sourceText += document.text;
  }

  return sourceText;
}

export function reorderDocumentsInYAMLSourceText(sourceText, order) {
  const sourceDocuments =
    Array.from(splitDocumentsInYAMLSourceText(sourceText));

  const sortedDocuments =
    Array.from(
      order,
      sourceIndex => sourceDocuments[sourceIndex]);

  return recombineDocumentsIntoYAMLSourceText(sortedDocuments);
}
