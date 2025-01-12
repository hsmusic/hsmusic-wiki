// Neat little shortcut for "reversing" the reference lists stored on other
// things - for example, tracks specify a "referenced tracks" property, and
// you would use this to compute a corresponding "referenced *by* tracks"
// property.

import {input, templateCompositeFrom} from '#composite';

import {exposeDependency} from '#composite/control-flow';
import {inputSoupyReverse, inputWikiData, withReverseReferenceList}
  from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `reverseReferenceList`,

  compose: false,

  inputs: {
    data: inputWikiData({allowMixedTypes: true}),
    reverse: inputSoupyReverse(),
  },

  steps: () => [
    withReverseReferenceList({
      data: input('data'),
      reverse: input('reverse'),
    }),

    exposeDependency({dependency: '#reverseReferenceList'}),
  ],
});
