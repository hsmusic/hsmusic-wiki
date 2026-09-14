import {inspect} from 'node:util';

import {colors} from '#cli';
import {input, V} from '#composite';
import Thing from '#thing';

import {exitWithoutDependency, exposeConstant} from '#composite/control-flow';
import {withIndexInList, withPropertiesFromObject} from '#composite/data';
import {soupyFind, thing} from '#composite/wiki-properties';

export class HomepageLayoutRow extends Thing {
  static [Thing.friendlyName] = `Homepage Row`;

  static [Thing.getPropertyDescriptors] = ({HomepageLayoutSection}) => ({
    // Update & expose

    section: thing(V(HomepageLayoutSection)),

    // Update only

    find: soupyFind(),

    // Expose only

    isHomepageLayoutRow: exposeConstant(V(true)),

    type: {
      flags: {expose: true},

      expose: {
        compute() {
          throw new Error(`'type' property validator must be overridden`);
        },
      },
    },

    rowNumber: [
      exitWithoutDependency('section', V(0)),
      withPropertiesFromObject('section', V(['rows', 'startCountingRowsFrom'])),

      withIndexInList('#section.rows', input.myself()),
      exitWithoutDependency('#index', V(0), V('index')),

      {
        dependencies: ['#section.startCountingRowsFrom', '#index'],
        compute: ({
          ['#section.startCountingRowsFrom']: startCountingRowsFrom,
          ['#index']: index,
        }) => startCountingRowsFrom + index,
      },
    ],
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Row': {ignore: true},
    },
  };

  [inspect.custom](depth) {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (depth >= 0 && this.section) {
      const sectionName = this.section.name;
      const index = this.section.rows.indexOf(this);
      const rowNum =
        (index === -1
          ? 'indeterminate position'
          : `#${index + 1}`);
      parts.push(` (${colors.yellow(rowNum)} in ${colors.green(sectionName)})`);
    }

    return parts.join('');
  }
}
