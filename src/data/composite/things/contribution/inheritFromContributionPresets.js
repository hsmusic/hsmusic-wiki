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
        ['#index']:
          values.findIndex(value =>
            value !== undefined &&
            value !== null),
      }),
    },

    raiseOutputWithoutDependency({
      dependency: '#index',
      mode: input.value('index'),
    }),

    {
      dependencies: ['#values', '#index'],

      compute: (continuation, {
        ['#values']: values,
        ['#index']: index,
      }) => continuation({
        ['#value']:
          values[index],
      }),
    },
  ],
});
