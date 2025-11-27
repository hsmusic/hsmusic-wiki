// Like inheritFromMainRelease, but tuned for contributions.
// Recontextualizes contributions for this track.

import {input, templateCompositeFrom} from '#composite';

import {exposeDependency, raiseOutputWithoutDependency}
  from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';
import {withRecontextualizedContributionList, withRedatedContributionList}
  from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `inheritContributionListFromMainRelease`,

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'isSecondaryRelease',
      mode: input.value('falsy'),
    }),

    withPropertyFromObject({
      object: 'mainReleaseTrack',
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
