import Thing from '#thing';

import {contentString, simpleString, thing} from '#composite/wiki-properties';

export class AdditionalName extends Thing {
  static [Thing.getPropertyDescriptors] = ({}) => ({
    // Update & expose

    thing: thing(),

    name: contentString(),
    annotation: contentString(),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Name': {property: 'name'},
      'Annotation': {property: 'annotation'},
    },
  };
}
