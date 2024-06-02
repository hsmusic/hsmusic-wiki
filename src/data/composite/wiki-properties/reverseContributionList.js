import {input, templateCompositeFrom} from '#composite';

import {exposeDependency} from '#composite/control-flow';
import {inputWikiData, withReverseContributionList} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `reverseContributionList`,

  compose: false,

  inputs: {
    data: inputWikiData({allowMixedTypes: false}),
    list: input({type: 'string'}),
  },

  steps: () => [
    withReverseContributionList({
      data: input('data'),
      list: input('list'),
    }),

    exposeDependency({dependency: '#reverseContributionList'}),
  ],
});
