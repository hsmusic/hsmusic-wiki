// Stores and exposes one connection, or reference, to another data object.
// The reference must be to a specific type, which is specified on the class
// input.
//
// See also:
//  - referenceList
//  - withResolvedReference
//

import {input, templateCompositeFrom} from '#composite';
import {validateReference} from '#validators';

import {exposeDependency} from '#composite/control-flow';
import {inputSoupyFind, inputWikiData, withResolvedReference}
  from '#composite/wiki-data';

import {referenceListInputDescriptions, referenceListUpdateDescription}
  from './helpers/reference-list-helpers.js';

export default templateCompositeFrom({
  annotation: `singleReference`,

  compose: false,

  inputs: {
    ...referenceListInputDescriptions(),

    data: inputWikiData({allowMixedTypes: true}),
    find: inputSoupyFind(),
  },

  update:
    referenceListUpdateDescription({
      validateReferenceList: validateReference,
    }),

  steps: () => [
    withResolvedReference({
      ref: input.updateValue(),
      data: input('data'),
      find: input('find'),
    }),

    exposeDependency({dependency: '#resolvedReference'}),
  ],
});
