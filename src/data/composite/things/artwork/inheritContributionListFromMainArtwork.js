import {input, templateCompositeFrom} from '#composite';

import {exposeDependency, raiseOutputWithoutDependency}
  from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';
import {withRecontextualizedContributionList, withRedatedContributionList}
  from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `inheritContributionListFromMainArtwork`,

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'isReusedArtwork',
      mode: input.value('falsy'),
    }),

    withPropertyFromObject({
      object: 'mainArtwork',
      property: input.thisProperty(),
    }).outputs({
      '#value': '#contributions',
    }),

    withRecontextualizedContributionList({
      list: '#contributions',
    }),

    withRedatedContributionList({
      list: '#contributions',
      date: 'date',
    }),

    exposeDependency({
      dependency: '#contributions',
    }),
  ],
});
