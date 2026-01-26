import {V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
import {color, name, thingList} from '#composite/wiki-properties';

export class HomepageLayoutSection extends Thing {
  static [Thing.friendlyName] = `Homepage Section`;

  static [Thing.getPropertyDescriptors] = ({HomepageLayoutRow}) => ({
    // Update & expose

    name: name(V(`Unnamed Homepage Section`)),

    color: color(),

    rows: thingList(V(HomepageLayoutRow)),

    // Expose only

    isHomepageLayoutSection: exposeConstant(V(true)),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Section': {property: 'name'},
      'Color': {property: 'color'},
    },
  };
}
