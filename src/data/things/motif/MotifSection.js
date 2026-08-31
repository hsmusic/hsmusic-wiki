import {input, V} from '#composite';
import Thing from '#thing';

import {color, flag, name, thingList} from '#composite/wiki-properties';

export class MotifSection extends Thing {
  static [Thing.friendlyName] = `Motif Section`;
  static [Thing.wikiData] = 'motifSectionData';

  static [Thing.getPropertyDescriptors] = ({Motif}) => ({
    name: name(V('Unnamed Motif Section')),
    color: color(),

    isDefaultMotifSection: flag(V(false)),

    motifs: thingList(V(Motif)),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Section': {property: 'name'},
      'Color': {property: 'color'},
    },
  };
}
