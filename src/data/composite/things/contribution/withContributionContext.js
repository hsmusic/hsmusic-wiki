import {input, templateCompositeFrom} from '#composite';

import {withPropertiesFromObject} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withContributionContext`,

  outputs: [
    '#contributionTarget',
    '#contributionProperty',
  ],

  steps: () => [
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
