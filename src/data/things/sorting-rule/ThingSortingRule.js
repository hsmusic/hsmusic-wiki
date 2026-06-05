import {V} from '#composite';
import Thing from '#thing';
import {isStringNonEmpty, strictArrayOf} from '#validators';

import {
  compareCaseLessSensitive,
  sortByDate,
  sortByDirectory,
  sortByName,
} from '#sort';

import {exposeConstant} from '#composite/control-flow';

import {SortingRule} from './SortingRule.js';

export class ThingSortingRule extends SortingRule {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    properties: {
      flags: {update: true, expose: true},
      update: {
        validate: strictArrayOf(isStringNonEmpty),
      },
    },

    // Expose only

    isThingSortingRule: exposeConstant(V(true)),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'By Properties': {property: 'properties'},
    },
  };

  sort(sortable) {
    if (this.properties) {
      for (const property of this.properties.toReversed()) {
        const get = thing => thing[property];
        const lc = property.toLowerCase();

        if (lc === 'date') {
          sortByDate(sortable);
          continue;
        } else if (lc.endsWith('date')) {
          sortByDate(sortable, {getDate: get});
          continue;
        }

        if (lc === 'directory') {
          sortByDirectory(sortable);
          continue;
        } else if (lc.endsWith('directory')) {
          sortByDirectory(sortable, {getDirectory: get});
          continue;
        }

        if (lc === 'name') {
          sortByName(sortable);
          continue;
        } else if (lc.endsWith('name')) {
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
