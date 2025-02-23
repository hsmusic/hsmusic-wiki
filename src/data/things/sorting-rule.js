export const SORTING_RULE_DATA_FILE = 'sorting-rules.yaml';

import {readFile, writeFile} from 'node:fs/promises';
import * as path from 'node:path';

import {input} from '#composite';
import {chunkByProperties, compareArrays, unique} from '#sugar';
import Thing from '#thing';
import {isObject, isStringNonEmpty, strictArrayOf} from '#validators';

import {
  compareCaseLessSensitive,
  sortByDate,
  sortByDirectory,
  sortByName,
} from '#sort';

import {
  documentModes,
  flattenThingLayoutToDocumentOrder,
  getThingLayoutForFilename,
  reorderDocumentsInYAMLSourceText,
} from '#yaml';

import {flag} from '#composite/wiki-properties';

export class SortingRule extends Thing {
  static [Thing.friendlyName] = `Sorting Rule`;

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    active: flag(true),

    message: {
      flags: {update: true, expose: true},
      update: {validate: isStringNonEmpty},
    },
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Message': {property: 'message'},
      'Active': {property: 'active'},
    },
  };

  static [Thing.getYamlLoadingSpec] = ({
    documentModes: {allInOne},
    thingConstructors: {DocumentSortingRule},
  }) => ({
    title: `Process sorting rules file`,
    file: SORTING_RULE_DATA_FILE,

    documentMode: allInOne,
    documentThing: document =>
      (document['Sort Documents']
        ? DocumentSortingRule
        : null),

    save: (results) => ({sortingRules: results}),
  });

  check({wikiData}) {
    return this.constructor.check(this, opts);
  }

  apply(opts) {
    return this.constructor.apply(this, opts);
  }

  static check() {
    throw new Error(`Not implemented`);
  }

  static async apply() {
    throw new Error(`Not implemented`);
  }

  static async* applyAll() {
    throw new Error(`Not implemented`);
  }

  static async* go({dataPath, wikiData}) {
    const rules = wikiData.sortingRules;
    const constructors = unique(rules.map(rule => rule.constructor));

    for (const constructor of constructors) {
      yield* constructor.applyAll(
        rules
          .filter(rule => rule.active)
          .filter(rule => rule.constructor === constructor),
        {dataPath, wikiData});
    }
  }
}

export class ThingSortingRule extends SortingRule {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    properties: {
      flags: {update: true, expose: true},
      update: {
        validate: strictArrayOf(isStringNonEmpty),
      },
    },
  });

  static [Thing.yamlDocumentSpec] = Thing.extendDocumentSpec(SortingRule, {
    fields: {
      'By Properties': {property: 'properties'},
    },
  });

  sort(sortable) {
    if (this.properties) {
      for (const property of this.properties.slice().reverse()) {
        const get = thing => thing[property];
        const lc = property.toLowerCase();

        if (lc.endsWith('date')) {
          sortByDate(sortable, {getDate: get});
          continue;
        }

        if (lc.endsWith('directory')) {
          sortByDirectory(sortable, {getDirectory: get});
          continue;
        }

        if (lc.endsWith('name')) {
          sortByName(sortable, {getName: get});
          continue;
        }

        const values = sortable.map(get);

        if (values.every(v => typeof v === 'string')) {
          sortable.sort((a, b) =>
            compareCaseLessSensitive(get(a), get(b)));
          continue;
        }

        if (values.every(v => typeof v === 'number')) {
          sortable.sort((a, b) => get(a) - get(b));
          continue;
        }

        sortable.sort((a, b) =>
          (get(a).toString() < get(b).toString()
            ? -1
         : get(a).toString() > get(b).toString()
            ? +1
            :  0));
      }
    }

    return sortable;
  }
}

export class DocumentSortingRule extends ThingSortingRule {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    // TODO: glob :plead:
    filename: {
      flags: {update: true, expose: true},
      update: {validate: isStringNonEmpty},
    },

    message: {
      flags: {update: true, expose: true},
      update: {validate: isStringNonEmpty},

      expose: {
        dependencies: ['filename'],
        transform: (value, {filename}) =>
          value ??
          `Sort ${filename}`,
      },
    },

    selectDocumentsFollowing: {
      flags: {update: true, expose: true},

      update: {
        validate(value) {
          isObject(value);

          const {length} = Object.keys(value);
          if (length !== 1) {
            throw new Error(`Expected object with 1 key, got ${length}`);
          }

          return true;
        },
      },
    },
  });

  static [Thing.yamlDocumentSpec] = Thing.extendDocumentSpec(ThingSortingRule, {
    fields: {
      'Sort Documents': {property: 'filename'},
      'Select Documents Following': {property: 'selectDocumentsFollowing'},
    },
  });

  static check(rule, {wikiData}) {
    const oldLayout = getThingLayoutForFilename(rule.filename, wikiData);
    if (!oldLayout) return;

    const newLayout = rule.#processLayout(oldLayout);

    const oldOrder = flattenThingLayoutToDocumentOrder(oldLayout);
    const newOrder = flattenThingLayoutToDocumentOrder(newLayout);

    return compareArrays(oldOrder, newOrder);
  }

  static async apply(rule, {wikiData, dataPath}) {
    const oldLayout = getThingLayoutForFilename(rule.filename, wikiData);
    if (!oldLayout) return;

    const newLayout = rule.#processLayout(oldLayout);
    const newOrder = flattenThingLayoutToDocumentOrder(newLayout);

    const realPath =
      path.join(
        dataPath,
        rule.filename.split(path.posix.sep).join(path.sep));

    const oldSourceText = await readFile(realPath, 'utf8');
    const newSourceText = reorderDocumentsInYAMLSourceText(oldSourceText, newOrder);

    await writeFile(realPath, newSourceText);
  }

  static async* applyAll(rules, {wikiData, dataPath}) {
    rules =
      rules
        .slice()
        .sort((a, b) => a.filename.localeCompare(b.filename));

    for (const {chunk, filename} of chunkByProperties(rules, ['filename'])) {
      const initialLayout = getThingLayoutForFilename(filename, wikiData);
      if (!initialLayout) continue;

      let currLayout = initialLayout;
      let prevLayout = initialLayout;
      let anyChanged = false;

      for (const rule of chunk) {
        currLayout = rule.#processLayout(currLayout);

        const prevOrder = flattenThingLayoutToDocumentOrder(prevLayout);
        const currOrder = flattenThingLayoutToDocumentOrder(currLayout);

        if (compareArrays(currOrder, prevOrder)) {
          yield {rule, changed: false};
        } else {
          anyChanged = true;
          yield {rule, changed: true};
        }

        prevLayout = currLayout;
      }

      if (!anyChanged) continue;

      const newLayout = currLayout;
      const newOrder = flattenThingLayoutToDocumentOrder(newLayout);

      const realPath =
        path.join(
          dataPath,
          filename.split(path.posix.sep).join(path.sep));

      const oldSourceText = await readFile(realPath, 'utf8');
      const newSourceText = reorderDocumentsInYAMLSourceText(oldSourceText, newOrder);

      await writeFile(realPath, newSourceText);
    }
  }

  #processLayout(layout) {
    const fresh = {...layout};

    let sortable = null;
    switch (fresh.documentMode) {
      case documentModes.headerAndEntries:
        sortable = fresh.entryThings =
          fresh.entryThings.slice();
        break;

      case documentModes.allInOne:
        sortable = fresh.things =
          fresh.things.slice();
        break;

      default:
        throw new Error(`Invalid document type for sorting`);
    }

    if (this.selectDocumentsFollowing) {
      const [field, value] = Object.entries(this.selectDocumentsFollowing)[0];

      const after =
        sortable.findIndex(thing =>
          thing[Thing.yamlSourceDocument][field] === value);

      const different =
        after +
        sortable
          .slice(after)
          .findIndex(thing =>
            Object.hasOwn(thing[Thing.yamlSourceDocument], field) &&
            thing[Thing.yamlSourceDocument][field] !== value);

      const before =
        (different === -1
          ? sortable.length
          : different);

      const subsortable =
        sortable.slice(after + 1, before);

      this.sort(subsortable);

      sortable.splice(after + 1, before - after - 1, ...subsortable);
    } else {
      this.sort(sortable);
    }

    return fresh;
  }
}
