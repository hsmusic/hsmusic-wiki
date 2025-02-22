export const SORTING_RULE_DATA_FILE = 'sorting-rules.yaml';

import {readFile, writeFile} from 'node:fs/promises';
import * as path from 'node:path';

import {input} from '#composite';
import Thing from '#thing';
import {isStringNonEmpty, strictArrayOf} from '#validators';

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
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
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
      update: {
        validate: isStringNonEmpty,
      },
    },
  });

  static [Thing.yamlDocumentSpec] = Thing.extendDocumentSpec(ThingSortingRule, {
    fields: {
      'Sort Documents': {property: 'filename'},
    },
  });

  async apply({wikiData, dataPath}) {
    let layout = getThingLayoutForFilename(this.filename, wikiData);
    if (!layout) return;

    layout = this.#processLayout(layout);

    const order = flattenThingLayoutToDocumentOrder(layout);

    const realPath =
      path.join(
        dataPath,
        this.filename.split(path.posix.sep).join(path.sep));

    let sourceText = await readFile(realPath, 'utf8');

    sourceText = reorderDocumentsInYAMLSourceText(sourceText, order);

    await writeFile(realPath, sourceText);
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

    this.sort(sortable);

    return fresh;
  }
}
