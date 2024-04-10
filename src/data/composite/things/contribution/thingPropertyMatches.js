import {input, templateCompositeFrom} from '#composite';

import {exitWithoutDependency} from '#composite/control-flow';

export default templateCompositeFrom({
  annotation: `thingPropertyMatches`,

  compose: false,

  inputs: {
    value: input({type: 'string'}),
  },

  steps: () => [
    exitWithoutDependency({
      dependency: 'thingProperty',
      value: input.value(false),
    }),

    {
      dependencies: [
        'thingProperty',
        input('value'),
      ],

      compute: ({
        ['thingProperty']: thingProperty,
        [input('value')]: value,
      }) =>
        thingProperty === value,
    },
  ],
});
