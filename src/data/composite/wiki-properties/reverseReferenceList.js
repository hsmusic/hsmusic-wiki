// Neat little shortcut for "reversing" the reference lists stored on other
// things - for example, tracks specify a "referenced tracks" property, and
// you would use this to compute a corresponding "referenced *by* tracks"
// property. Naturally, the passed ref list property is of the things in the
// wiki data provided, not the requesting Thing itself.
//
// Reference code for:
//  - (atomic) reverseReferenceList
//

import {input, templateCompositeFrom} from '#composite';

import {exposeDependency} from '#composite/control-flow';
import {inputWikiData, withReverseReferenceList} from '#composite/wiki-data';

export const REFERENCE = templateCompositeFrom({
  annotation: `reverseReferenceList`,

  compose: false,

  inputs: {
    data: inputWikiData({allowMixedTypes: false}),
    list: input({type: 'string'}),
  },

  steps: () => [
    withReverseReferenceList({
      data: input('data'),
      list: input('list'),
    }),

    exposeDependency({dependency: '#reverseReferenceList'}),
  ],
});

export {default} from './atomic/reverseReferenceList.js';
