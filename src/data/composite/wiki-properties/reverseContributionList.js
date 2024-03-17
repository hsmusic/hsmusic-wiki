import {input, templateCompositeFrom} from '#composite';
import {is} from '#validators';

import {exposeDependency} from '#composite/control-flow';
import {inputWikiData, withReverseContributionList} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `reverseContributionList`,

  compose: false,

  inputs: {
    data: inputWikiData({allowMixedTypes: false}),
    list: input({type: 'string'}),

    mode: input({
      validate: is('things', 'contributions'),
      defaultValue: 'things',
    }),
  },

  steps: () => [
    withReverseContributionList({
      data: input('data'),
      list: input('list'),
      mode: input('mode'),
    }),

    exposeDependency({dependency: '#reverseContributionList'}),
  ],
});
