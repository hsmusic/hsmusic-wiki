// Stores and exposes a list of references to other data objects; all items
// must be references to the same type, which is either implied from the class
// input, or explicitly set on the referenceType input.
//
// See also:
//  - singleReference
//  - withResolvedReferenceList
//

import {input, templateCompositeFrom} from '#composite';
import {validateReferenceList} from '#validators';

import {exposeDependency} from '#composite/control-flow';

import {
  inputFindOptions,
  inputSoupyFind,
  inputWikiData,
  withResolvedReferenceList,
} from '#composite/wiki-data';

import {referenceListInputDescriptions, referenceListUpdateDescription}
  from './helpers/reference-list-helpers.js';

export default templateCompositeFrom({
  annotation: `referenceList`,

  compose: false,

  inputs: {
    ...referenceListInputDescriptions(),

    data: inputWikiData({allowMixedTypes: true}),
    find: inputSoupyFind(),
    findOptions: inputFindOptions(),
  },

  update:
    referenceListUpdateDescription({
      validateReferenceList: validateReferenceList,
    }),

  steps: () => [
    withResolvedReferenceList({
      list: input.updateValue(),
      data: input('data'),
      find: input('find'),
      findOptions: input('findOptions'),
    }),

    exposeDependency({dependency: '#resolvedReferenceList'}),
  ],
});
