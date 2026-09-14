import {input, V} from '#composite';
import Thing from '#thing';

import {exitWithoutDependency, exposeConstant, exposeDependency}
  from '#composite/control-flow';
import {withLengthOfList, withNearbyItemFromList, withPropertyFromObject}
  from '#composite/data';
import {color, flag, name, thing, thingList} from '#composite/wiki-properties';

export class HomepageLayoutSection extends Thing {
  static [Thing.friendlyName] = `Homepage Section`;

  static [Thing.getPropertyDescriptors] = ({
    HomepageLayout,
    HomepageLayoutRow,
  }) => ({
    // Update & expose

    homepageLayout: thing(V(HomepageLayout)),

    name: name(V(`Unnamed Homepage Section`)),

    color: color(),

    isDefaultHomepageLayoutSection: flag(V(false)),

    rows: thingList(V(HomepageLayoutRow)),

    // Expose only

    isHomepageLayoutSection: exposeConstant(V(true)),

    startCountingRowsFrom: [
      withPropertyFromObject('homepageLayout', V('sections')),

      withNearbyItemFromList({
        list: '#homepageLayout.sections',
        item: input.myself(),
        offset: input.value(-1),
      }).outputs({
        '#nearbyItem': '#previousSection',
      }),

      exitWithoutDependency('#previousSection', V(1)),

      withPropertyFromObject('#previousSection', V('continueCountingRowsFrom')),
      exposeDependency('#previousSection.continueCountingRowsFrom'),
    ],

    continueCountingRowsFrom: [
      withLengthOfList('rows'),

      {
        dependencies: ['startCountingRowsFrom', '#rows.length'],
        compute: ({startCountingRowsFrom, '#rows.length': rows}) =>
          startCountingRowsFrom + rows,
      },
    ],
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Section': {property: 'name'},
      'Color': {property: 'color'},
    },
  };
}
