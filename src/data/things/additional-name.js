import {input} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
import {contentString, thing} from '#composite/wiki-properties';

export class AdditionalName extends Thing {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    thing: thing(),

    name: contentString(),
    annotation: contentString(),

    // Expose only

    isAdditionalName: [
      exposeConstant({
        value: input.value(true),
      }),
    ],
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Name': {property: 'name'},
      'Annotation': {property: 'annotation'},
    },
  };
}
