import {input} from '#composite';
import Thing from '#thing';
import {isString, validateArrayItems} from '#validators';

import {contentString, simpleString} from '#composite/wiki-properties';

import {exposeConstant, exposeUpdateValueOrContinue}
  from '#composite/control-flow';

export class AdditionalFile extends Thing {
  static [Thing.getPropertyDescriptors] = ({}) => ({
    // Update & expose

    title: simpleString(),

    description: contentString(),

    files: [
      exposeUpdateValueOrContinue({
        validate: input.value(validateArrayItems(isString)),
      }),

      exposeConstant({
        value: input.value([]),
      }),
    ],
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Title': {property: 'title'},
      'Description': {property: 'description'},
      'Files': {property: 'files'},
    },
  };
}
