import {input} from '#composite';
import Thing from '#thing';
import {isString, validateArrayItems} from '#validators';

import {contentString, simpleString, thing} from '#composite/wiki-properties';

import {exposeConstant, exposeUpdateValueOrContinue}
  from '#composite/control-flow';

export class AdditionalFile extends Thing {
  static [Thing.getPropertyDescriptors] = ({}) => ({
    // Update & expose

    thing: thing(),

    title: simpleString(),

    description: contentString(),

    filenames: [
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
      'Files': {property: 'filenames'},
    },
  };

  get paths() {
    if (!this.thing) return null;
    if (!this.thing.getOwnAdditionalFilePath) return null;

    return (
      this.filenames.map(filename =>
        this.thing.getOwnAdditionalFilePath(this, filename)));
  }
}
