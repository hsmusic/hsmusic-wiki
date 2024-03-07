import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

export default templateCompositeFrom({
  annotation: `withContributionContext`,

  outputs: [
    '#contributionTarget',
    '#contributionProperty',
  ],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'thing',
      output: input.value({
        '#contributionTarget': null,
        '#contributionProperty': null,
      }),
    }),

    raiseOutputWithoutDependency({
      dependency: 'thingProperty',
      output: input.value({
        '#contributionTarget': null,
        '#contributionProperty': null,
      }),
    }),

    {
      dependencies: ['thing', 'thingProperty'],

      compute: (continuation, {
        ['thing']: thing,
        ['thingProperty']: thingProperty,
      }) => continuation({
        ['#contributionTarget']:
          thing.constructor[Symbol.for('Thing.referenceType')],

        ['#contributionProperty']:
          thingProperty,
      }),
    },
  ],
});
