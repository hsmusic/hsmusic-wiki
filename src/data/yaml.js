// yaml.js - specification for HSMusic YAML data file format and utilities for
// loading, processing, and validating YAML files and documents

import {readFile, stat} from 'node:fs/promises';
import * as path from 'node:path';
import {inspect as nodeInspect} from 'node:util';

import yaml from 'js-yaml';

import {colors, ENABLE_COLOR, logInfo, logWarn} from '#cli';
import {sortByName} from '#sort';
import {atOffset, empty, filterProperties, typeAppearance, withEntries}
  from '#sugar';
import Thing from '#thing';
import thingConstructors from '#things';

import {
  filterReferenceErrors,
  reportContentTextErrors,
  reportDuplicateDirectories,
} from '#data-checks';

import {
  annotateErrorWithFile,
  decorateErrorWithIndex,
  decorateErrorWithAnnotation,
  openAggregate,
  showAggregate,
  withAggregate,
} from '#aggregate';

function inspect(value, opts = {}) {
  return nodeInspect(value, {colors: ENABLE_COLOR, ...opts});
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
  // C can't coexist iwth A, B, or D - but it's okay for D to coexist with
  // A or B.
  //
  invalidFieldCombinations = [],
}) {
  if (!thingConstructor) {
    throw new Error(`Missing Thing class`);
  }

  if (!fieldSpecs) {
    throw new Error(`Expected fields to be provided`);
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
      message: `Errors processing ${constructorPart}` + namePart,
    });

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

    for (const {message, fields} of invalidFieldCombinations) {
      const fieldsPresent =
        presentFields.filter(field => fields.includes(field));

      if (fieldsPresent.length >= 2) {
        const filteredDocument =
          filterProperties(
            document,
            fieldsPresent,
            {preserveOriginalOrder: true});

        fieldCombinationErrors.push(
          new FieldCombinationError(filteredDocument, message));

        for (const field of Object.keys(filteredDocument)) {
          skippedFields.add(field);
        }
      }
    }

    if (!empty(fieldCombinationErrors)) {
      aggregate.push(new FieldCombinationAggregateError(fieldCombinationErrors));
    }

    const fieldValues = {};

    for (const [field, documentValue] of documentEntries) {
      if (skippedFields.has(field)) continue;

      // This variable would like to certify itself as "not into capitalism".
      let propertyValue =
        (fieldSpecs[field].transform
          ? fieldSpecs[field].transform(documentValue)
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

      fieldValues[field] = propertyValue;
    }

    const thing = Reflect.construct(thingConstructor, []);

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

    return {thing, aggregate};
  });
}

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
  constructor(fields, message) {
    const fieldNames = Object.keys(fields);

    const fieldNamesText =
      fieldNames
        .map(field => colors.red(field))
        .join(', ');

    const mainMessage = `Don't combine ${fieldNamesText}`;

    const causeMessage =
      (typeof message === 'function'
        ? message(fields)
     : typeof message === 'string'
        ? message
        : null);

    super(mainMessage, {
      cause:
        (causeMessage
          ? new Error(causeMessage)
          : null),
    });

    this.fields = fields;
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
      colors.bright(colors.yellow(`Altogether, skipped ${numFieldsText}:\n`)) +
      lines.join('\n') + '\n' +
      colors.bright(colors.yellow(`See above errors for details.`)));
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

export function parseAdditionalFiles(array) {
  if (!Array.isArray(array)) {
    // Error will be caught when validating against whatever this value is
    return array;
  }

  return array.map((item) => ({
    title: item['Title'],
    description: item['Description'] ?? null,
    files: item['Files'],
  }));
}

export const extractAccentRegex =
  /^(?<main>.*?)(?: \((?<accent>.*)\))?$/;

export const extractPrefixAccentRegex =
  /^(?:\((?<accent>.*)\) )?(?<main>.*?)$/;

export function parseContributors(contributionStrings) {
  // If this isn't something we can parse, just return it as-is.
  // The Thing object's validators will handle the data error better
  // than we're able to here.
  if (!Array.isArray(contributionStrings)) {
    return contributionStrings;
  }

  return contributionStrings.map(item => {
    if (typeof item === 'object' && item['Who'])
      return {
        artist: item['Who'],
        annotation: item['What'] ?? null,
      };

    if (typeof item === 'object' && item['Artist'])
      return {
        artist: item['Artist'],
        annotation: item['Annotation'] ?? null,
      };

    if (typeof item !== 'string') return item;

    const match = item.match(extractAccentRegex);
    if (!match) return item;

    return {
      artist: match.groups.main,
      annotation: match.groups.accent ?? null,
    };
  });
}

export function parseAdditionalNames(additionalNameStrings) {
  if (!Array.isArray(additionalNameStrings)) {
    return additionalNameStrings;
  }

  return additionalNameStrings.map(item => {
    if (typeof item === 'object' && item['Name'])
      return {name: item['Name'], annotation: item['Annotation'] ?? null};

    if (typeof item !== 'string') return item;

    const match = item.match(extractAccentRegex);
    if (!match) return item;

    return {
      name: match.groups.main,
      annotation: match.groups.accent ?? null,
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
export const getDataSteps = () => {
  const steps = [];

  for (const thingConstructor of Object.values(thingConstructors)) {
    const getSpecFn = thingConstructor[Thing.getYamlLoadingSpec];
    if (!getSpecFn) continue;

    steps.push(getSpecFn({
      documentModes,
      thingConstructors,
    }));
  }

  sortByName(steps, {getName: step => step.title});

  return steps;
};

export async function loadAndProcessDataDocuments({dataPath}) {
  const processDataAggregate = openAggregate({
    message: `Errors processing data files`,
  });
  const wikiDataResult = {};

  function decorateErrorWithFile(fn) {
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

  function asyncDecorateErrorWithFile(fn) {
    return decorateErrorWithFile(fn).async;
  }

  for (const dataStep of getDataSteps()) {
    await processDataAggregate.nestAsync(
      {
        message: `Errors during data step: ${colors.bright(dataStep.title)}`,
        translucent: true,
      },
      async ({call, callAsync, map, mapAsync, push}) => {
        const {documentMode} = dataStep;

        if (!Object.values(documentModes).includes(documentMode)) {
          throw new Error(`Invalid documentMode: ${documentMode.toString()}`);
        }

        // Hear me out, it's been like 1200 years since I wrote the rest of
        // this beautifully error-containing code and I don't know how to
        // integrate this nicely. So I'm just returning the result and the
        // error that should be thrown. Yes, we're back in callback hell,
        // just without the callbacks. Thank you.
        const filterBlankDocuments = documents => {
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

          return {documents: filteredDocuments, aggregate};
        };

        const processDocument = (document, thingClassOrFn) => {
          const thingClass =
            (thingClassOrFn.prototype instanceof Thing
              ? thingClassOrFn
              : thingClassOrFn(document));

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

          // TODO: Making a function to only call it just like that is
          // obviously pretty jank! It should be created once per data step.
          const fn = makeProcessDocument(thingClass, spec);
          return fn(document);
        };

        if (
          documentMode === documentModes.allInOne ||
          documentMode === documentModes.oneDocumentTotal
        ) {
          if (!dataStep.file) {
            throw new Error(`Expected 'file' property for ${documentMode.toString()}`);
          }

          const file = path.join(
            dataPath,
            typeof dataStep.file === 'function'
              ? await callAsync(dataStep.file, dataPath)
              : dataStep.file);

          const statResult = await callAsync(() =>
            stat(file).then(
              () => true,
              error => {
                if (error.code === 'ENOENT') {
                  return false;
                } else {
                  throw error;
                }
              }));

          if (statResult === false) {
            const saveResult = call(dataStep.save, {
              [documentModes.allInOne]: [],
              [documentModes.oneDocumentTotal]: {},
            }[documentMode]);

            if (!saveResult) return;

            Object.assign(wikiDataResult, saveResult);

            return;
          }

          const readResult = await callAsync(readFile, file, 'utf-8');

          if (!readResult) {
            return;
          }

          let processResults;

          switch (documentMode) {
            case documentModes.oneDocumentTotal: {
              const yamlResult = call(yaml.load, readResult);

              if (!yamlResult) {
                processResults = null;
                break;
              }

              const {thing, aggregate} =
                processDocument(yamlResult, dataStep.documentThing);

              processResults = thing;

              call(() => aggregate.close());

              break;
            }

            case documentModes.allInOne: {
              const yamlResults = call(yaml.loadAll, readResult);

              if (!yamlResults) {
                processResults = [];
                return;
              }

              const {documents, aggregate: filterAggregate} =
                filterBlankDocuments(yamlResults);

              call(filterAggregate.close);

              processResults = [];

              map(documents, decorateErrorWithIndex(document => {
                const {thing, aggregate} =
                  processDocument(document, dataStep.documentThing);

                processResults.push(thing);
                aggregate.close();
              }), {message: `Errors processing documents`});

              break;
            }
          }

          if (!processResults) return;

          const saveResult = call(dataStep.save, processResults);

          if (!saveResult) return;

          Object.assign(wikiDataResult, saveResult);

          return;
        }

        if (!dataStep.files) {
          throw new Error(`Expected 'files' property for ${documentMode.toString()}`);
        }

        const filesFromDataStep =
          (typeof dataStep.files === 'function'
            ? await callAsync(() =>
                dataStep.files(dataPath).then(
                  files => files,
                  error => {
                    if (error.code === 'ENOENT') {
                      return [];
                    } else {
                      throw error;
                    }
                  }))
            : dataStep.files);

        const filesUnderDataPath =
          filesFromDataStep
            .map(file => path.join(dataPath, file));

        const yamlResults = [];

        await mapAsync(filesUnderDataPath, {message: `Errors loading data files`},
          asyncDecorateErrorWithFile(async file => {
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

            const {documents: filteredDocuments, aggregate: filterAggregate} =
              filterBlankDocuments(documents);

            try {
              filterAggregate.close();
            } catch (caughtError) {
              // Blank documents aren't a critical error, they're just something
              // that should be noted - the (filtered) documents still get pushed.
              const pathToFile = path.relative(dataPath, file);
              annotateErrorWithFile(caughtError, pathToFile);
              push(caughtError);
            }

            yamlResults.push({file, documents: filteredDocuments});
          }));

        const processResults = [];

        switch (documentMode) {
          case documentModes.headerAndEntries:
            map(yamlResults, {message: `Errors processing documents in data files`, translucent: true},
              decorateErrorWithFile(({documents}) => {
                const headerDocument = documents[0];
                const entryDocuments = documents.slice(1).filter(Boolean);

                if (!headerDocument)
                  throw new Error(`Missing header document (empty file or erroneously starting with "---"?)`);

                withAggregate({message: `Errors processing documents`}, ({push}) => {
                  const {thing: headerObject, aggregate: headerAggregate} =
                    processDocument(headerDocument, dataStep.headerDocumentThing);

                  try {
                    headerAggregate.close();
                  } catch (caughtError) {
                    caughtError.message = `(${colors.yellow(`header`)}) ${caughtError.message}`;
                    push(caughtError);
                  }

                  const entryObjects = [];

                  for (let index = 0; index < entryDocuments.length; index++) {
                    const entryDocument = entryDocuments[index];

                    const {thing: entryObject, aggregate: entryAggregate} =
                      processDocument(entryDocument, dataStep.entryDocumentThing);

                    entryObjects.push(entryObject);

                    try {
                      entryAggregate.close();
                    } catch (caughtError) {
                      caughtError.message = `(${colors.yellow(`entry #${index + 1}`)}) ${caughtError.message}`;
                      push(caughtError);
                    }
                  }

                  processResults.push({
                    header: headerObject,
                    entries: entryObjects,
                  });
                });
              }));
            break;

          case documentModes.onePerFile:
            map(yamlResults, {message: `Errors processing data files as valid documents`},
              decorateErrorWithFile(({documents}) => {
                if (documents.length > 1)
                  throw new Error(`Only expected one document to be present per file, got ${documents.length} here`);

                if (empty(documents) || !documents[0])
                  throw new Error(`Expected a document, this file is empty`);

                const {thing, aggregate} =
                  processDocument(documents[0], dataStep.documentThing);

                processResults.push(thing);
                aggregate.close();
              }));
            break;
        }

        const saveResult = call(dataStep.save, processResults);

        if (!saveResult) return;

        Object.assign(wikiDataResult, saveResult);
      }
    );
  }

  return {
    aggregate: processDataAggregate,
    result: wikiDataResult,
  };
}

// Data linking! Basically, provide (portions of) wikiData to the Things which
// require it - they'll expose dynamically computed properties as a result (many
// of which are required for page HTML generation and other expected behavior).
export function linkWikiDataArrays(wikiData) {
  const linkWikiDataSpec = new Map([
    [wikiData.albumData, [
      'artTagData',
      'artistData',
      'groupData',
    ]],

    [wikiData.artTagData, [
      'albumData',
      'trackData',
    ]],

    [wikiData.artistData, [
      'albumData',
      'artistData',
      'flashData',
      'trackData',
    ]],

    [wikiData.flashData, [
      'artistData',
      'flashActData',
      'trackData',
    ]],

    [wikiData.flashActData, [
      'flashData',
      'flashSideData',
    ]],

    [wikiData.flashSideData, [
      'flashActData',
    ]],

    [wikiData.groupData, [
      'albumData',
      'groupCategoryData',
    ]],

    [wikiData.groupCategoryData, [
      'groupData',
    ]],

    [wikiData.homepageLayout?.rows, [
      'albumData',
      'groupData',
    ]],

    [wikiData.trackData, [
      'albumData',
      'artTagData',
      'artistData',
      'flashData',
      'trackData',
    ]],

    [[wikiData.wikiInfo], [
      'groupData',
    ]],
  ]);

  for (const [things, keys] of linkWikiDataSpec.entries()) {
    if (things === undefined) continue;
    for (const thing of things) {
      if (thing === undefined) continue;
      for (const key of keys) {
        if (!(key in wikiData)) continue;
        thing[key] = wikiData[key];
      }
    }
  }
}

export function sortWikiDataArrays(wikiData) {
  for (const [key, value] of Object.entries(wikiData)) {
    if (!Array.isArray(value)) continue;
    wikiData[key] = value.slice();
  }

  const steps = getDataSteps();

  for (const step of steps) {
    if (!step.sort) continue;
    step.sort(wikiData);
  }

  // Re-link data arrays, so that every object has the new, sorted versions.
  // Note that the sorting step deliberately creates new arrays (mutating
  // slices instead of the original arrays) - this is so that the object
  // caching system understands that it's working with a new ordering.
  // We still need to actually provide those updated arrays over again!
  linkWikiDataArrays(wikiData);
}

// Utility function for loading all wiki data from the provided YAML data
// directory (e.g. the root of the hsmusic-data repository). This doesn't
// provide much in the way of customization; it's meant to be used more as
// a boilerplate for more specialized output, or as a quick start in utilities
// where reporting info about data loading isn't as relevant as during the
// main wiki build process.
export async function quickLoadAllFromYAML(dataPath, {
  bindFind,
  getAllFindSpecs,

  showAggregate: customShowAggregate = showAggregate,
}) {
  const showAggregate = customShowAggregate;

  let wikiData;

  {
    const {aggregate, result} = await loadAndProcessDataDocuments({dataPath});

    wikiData = result;

    try {
      aggregate.close();
      logInfo`Loaded data without errors. (complete data)`;
    } catch (error) {
      showAggregate(error);
      logWarn`Loaded data with errors. (partial data)`;
    }
  }

  linkWikiDataArrays(wikiData);

  try {
    reportDuplicateDirectories(wikiData, {getAllFindSpecs});
    logInfo`No duplicate directories found. (complete data)`;
  } catch (error) {
    showAggregate(error);
    logWarn`Duplicate directories found. (partial data)`;
  }

  try {
    filterReferenceErrors(wikiData, {bindFind}).close();
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

  sortWikiDataArrays(wikiData);

  return wikiData;
}
