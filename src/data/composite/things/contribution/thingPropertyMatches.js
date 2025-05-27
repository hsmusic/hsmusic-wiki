import {input, templateCompositeFrom} from '#composite';

import {exitWithoutDependency} from '#composite/control-flow';

export default templateCompositeFrom({
  annotation: `thingPropertyMatches`,

  compose: false,

  inputs: {
    value: input({type: 'string'}),
  },

  steps: () => [
    {
      dependencies: ['thing', 'thingProperty'],

      compute: (continuation, {thing, thingProperty}) =>
        continuation({
          ['#thingProperty']:
            (thing.constructor[Symbol.for('Thing.referenceType')] === 'artwork'
              ? thing.artistContribsFromThingProperty
              : thingProperty),
        }),
    },

    exitWithoutDependency({
      dependency: '#thingProperty',
      value: input.value(false),
    }),

    {
      dependencies: [
        '#thingProperty',
        input('value'),
      ],

      compute: ({
        ['#thingProperty']: thingProperty,
        [input('value')]: value,
      }) =>
        thingProperty === value,
    },
  ],
});
