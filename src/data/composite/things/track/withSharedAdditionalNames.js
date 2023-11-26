// Compiles additional names directly provided on other releases.

import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withFlattenedList} from '#composite/data';

import CacheableObject from '#cacheable-object';

import withOtherReleases from './withOtherReleases.js';

export default templateCompositeFrom({
  annotation: `withSharedAdditionalNames`,

  outputs: ['#sharedAdditionalNames'],

  steps: () => [
    withOtherReleases(),

    raiseOutputWithoutDependency({
      dependency: '#otherReleases',
      mode: input.value('empty'),
      output: input.value({'#inferredAdditionalNames': []}),
    }),

    // TODO: Using getUpdateValue is always a bit janky.

    {
      dependencies: ['#otherReleases'],
      compute: (continuation, {
        ['#otherReleases']: otherReleases,
      }) => continuation({
        ['#otherReleases.additionalNames']:
          otherReleases.map(release =>
            CacheableObject.getUpdateValue(release, 'additionalNames')
              ?? []),
      }),
    },

    withFlattenedList({
      list: '#otherReleases.additionalNames',
    }).outputs({
      '#flattenedList': '#sharedAdditionalNames',
    }),
  ],
});
