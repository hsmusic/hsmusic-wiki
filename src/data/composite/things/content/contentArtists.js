import {input, templateCompositeFrom} from '#composite';
import {validateReferenceList} from '#validators';

import {exitWithoutDependency, exposeDependency}
  from '#composite/control-flow';
import {withResolvedReferenceList} from '#composite/wiki-data';
import {soupyFind} from '#composite/wiki-properties';

import withExpressedOrImplicitArtistReferences
  from './helpers/withExpressedOrImplicitArtistReferences.js';

export default templateCompositeFrom({
  annotation: `contentArtists`,

  compose: false,

  update: {
    validate: validateReferenceList('artist'),
  },

  steps: () => [
    withExpressedOrImplicitArtistReferences({
      from: input.updateValue(),
    }),

    exitWithoutDependency({
      dependency: '#artistReferences',
    }),

    withResolvedReferenceList({
      list: '#artistReferences',
      find: soupyFind.input('artist'),
    }),

    exposeDependency({
      dependency: '#resolvedReferenceList',
    }),
  ],
});
