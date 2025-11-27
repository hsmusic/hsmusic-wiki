import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withPropertyFromList} from '#composite/data';

export default templateCompositeFrom({
  annotation: `inheritFromContributionPresets`,

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'matchingContributionPresets',
      mode: input.value('empty'),
    }),

    withPropertyFromList({
      list: 'matchingContributionPresets',
      property: input.thisProperty(),
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
