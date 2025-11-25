import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withDate`,

  inputs: {
    from: input({
      defaultDependency: '_date',
      acceptsNull: true,
    }),
  },

  outputs: ['#date'],

  steps: () => [
    {
      dependencies: [input('from')],
      compute: (continuation, {
        [input('from')]: date,
      }) =>
        (date
          ? continuation.raiseOutput({'#date': date})
          : continuation()),
    },

    raiseOutputWithoutDependency({
      dependency: 'dateFromThingProperty',
      output: input.value({'#date': null}),
    }),

    withPropertyFromObject({
      object: 'thing',
      property: 'dateFromThingProperty',
    }).outputs({
      ['#value']: '#date',
    }),
  ],
})
