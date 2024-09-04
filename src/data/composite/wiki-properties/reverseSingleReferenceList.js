import {input, templateCompositeFrom} from '#composite';

import {exposeDependency} from '#composite/control-flow';
import {inputWikiData, withReverseSingleReferenceList} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `reverseSingleReferenceList`,

  compose: false,

  inputs: {
    data: inputWikiData({allowMixedTypes: false}),
    ref: input({type: 'string'}),
  },

  steps: () => [
    withReverseSingleReferenceList({
      data: input('data'),
      ref: input('ref'),
    }),

    exposeDependency({dependency: '#reverseSingleReferenceList'}),
  ],
});
