import {input, templateCompositeFrom} from '#composite';

import {withPropertyFromObject} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withDate`,

  inputs: {
    from: input({
      defaultDependency: 'date',
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

    withPropertyFromObject({
      object: 'thing',
      property: 'dateFromThingProperty',
    }).outputs({
      ['#value']: '#date',
    }),
  ],
})
