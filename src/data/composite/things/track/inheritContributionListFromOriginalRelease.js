// Like inheritFromOriginalRelease, but tuned for contributions.
// Recontextualized contributions for this track.

import {input, templateCompositeFrom} from '#composite';

import {exposeDependency, raiseOutputWithoutDependency}
  from '#composite/control-flow';
import {withRecontextualizedContributionList} from '#composite/wiki-data';

import withPropertyFromOriginalRelease
  from './withPropertyFromOriginalRelease.js';

export default templateCompositeFrom({
  annotation: `inheritContributionListFromOriginalRelease`,

  steps: () => [
    withPropertyFromOriginalRelease({
      property: input.thisProperty(),
      notFoundValue: input.value([]),
    }),

    raiseOutputWithoutDependency({
      dependency: '#isRerelease',
      mode: input.value('falsy'),
    }),

    withRecontextualizedContributionList({
      list: '#originalValue',
    }),

    exposeDependency({
      dependency: '#originalValue',
    }),
  ],
});
