// Like inheritFromMainRelease, but tuned for contributions.
// Recontextualizes contributions for this track.

import {input, templateCompositeFrom} from '#composite';

import {exposeDependency, raiseOutputWithoutDependency}
  from '#composite/control-flow';
import {withRecontextualizedContributionList, withRedatedContributionList}
  from '#composite/wiki-data';

import withPropertyFromMainRelease
  from './withPropertyFromMainRelease.js';

export default templateCompositeFrom({
  annotation: `inheritContributionListFromMainRelease`,

  steps: () => [
    withPropertyFromMainRelease({
      property: input.thisProperty(),
      notFoundValue: input.value([]),
    }),

    raiseOutputWithoutDependency({
      dependency: '#isSecondaryRelease',
      mode: input.value('falsy'),
    }),

    withRecontextualizedContributionList({
      list: '#mainReleaseValue',
    }),

    withRedatedContributionList({
      list: '#mainReleaseValue',
      date: 'date',
    }),

    exposeDependency({
      dependency: '#mainReleaseValue',
    }),
  ],
});
