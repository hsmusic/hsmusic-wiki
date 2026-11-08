import {input, V} from '#composite';
import Thing from '#thing';
import {isInteger} from '#validators';

import {exposeConstant} from '#composite/control-flow';

import {ArtTag} from './ArtTag.js';

export class CategoryArtTag extends ArtTag {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    crowdednessThreshold: {
      flags: {update: true, expose: true},

      update: {
        validate(value) {
          isInteger(value);

          if (value < 2) throw new Error(`Expected threshold of 2 or greater`);

          return true;
        },

        expose: value => value ?? 2,
      },
    },

    // Expose only

    isCategoryArtTag:
      exposeConstant(V(true)),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Category': {property: 'name'},

      'Crowdedness Threshold': {property: 'crowdednessThreshold'},
    },
  };
}
