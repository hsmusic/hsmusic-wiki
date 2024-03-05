import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withPropertyFromList, withPropertyFromObject} from '#composite/data';

import withMatchingContributionPresets
  from './withMatchingContributionPresets.js';

export default templateCompositeFrom({
  annotation: `inheritFromContributionPresets`,

  inputs: {
    property: input({type: 'string'}),
  },

  steps: () => [
    withMatchingContributionPresets().outputs({
      '#matchingContributionPresets': '#presets',
    }),

    raiseOutputWithoutDependency({
      dependency: '#presets',
      mode: input.value('empty'),
    }),

    withPropertyFromList({
      list: '#presets',
      property: input('property'),
    }),

    {
      dependencies: ['#values'],

      compute: (continuation, {
        ['#values']: values,
      }) => continuation({
        ['#presetIndex']:
          values.findIndex(value =>
            value !== undefined &&
            value !== null),
      }),
    },

    raiseOutputWithoutDependency({
      dependency: '#presetIndex',
      mode: input.value('index'),
    }),

    {
      dependencies: ['#presets', '#presetIndex'],

      compute: (continuation, {
        ['#presets']: presets,
        ['#presetIndex']: presetIndex,
      }) => continuation({
        ['#preset']:
          presets[presetIndex],
      }),
    },

    withPropertyFromObject({
      object: '#preset',
      property: input('property'),
    }),

    // Can't use exposeDependency here since it doesn't compose, and so looks
    // unfit to serve as the composition's base - even though we'll have raised
    // out of this composition in the relevant cases already!
    {
      dependencies: ['#value'],
      compute: (continuation, {
        ['#value']: value,
      }) => continuation.exit(value),
    },
  ],
});
