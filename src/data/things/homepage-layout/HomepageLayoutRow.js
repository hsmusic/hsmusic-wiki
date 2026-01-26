import {inspect} from 'node:util';

import {colors} from '#cli';
import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
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
