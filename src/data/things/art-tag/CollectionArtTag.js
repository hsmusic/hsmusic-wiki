import {input, V} from '#composite';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
import {flag} from '#composite/wiki-properties';

import {ArtTag} from './ArtTag.js';

export class CollectionArtTag extends ArtTag {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    bounded: flag(V(false)),

    // Expose only

    isCollectionArtTag:
      exposeConstant(V(true)),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Collection': {property: 'name'},
      'Bounded': {property: 'bounded'},
    },
  };
}
