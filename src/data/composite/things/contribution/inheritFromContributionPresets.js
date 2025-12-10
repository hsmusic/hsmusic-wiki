import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withPropertyFromList} from '#composite/data';

export default templateCompositeFrom({
  annotation: `inheritFromContributionPresets`,

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'matchingPresets',
      mode: input.value('empty'),
    }),

    withPropertyFromList({
      list: 'matchingPresets',
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
