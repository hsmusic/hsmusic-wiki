import {input, templateCompositeFrom} from '#composite';

import {getOutputName} from './helpers/property-from-helpers.js';

export default templateCompositeFrom({
  annotation: `withMappedList`,

  inputs: {
    list: input({type: 'array'}),
  },

  outputs: ({
    [input.staticDependency('list')]: list,
  }) => [
    (list
      ? getOutputName({property: 'length', from: list})
      : '#length'),
  ],

  steps: () => [
    {
      dependencies: [input.staticDependency('list')],
      compute: (continuation, {
        [input.staticDependency('list')]: list,
      }) => continuation({
        '#output':
          (list
            ? getOutputName({property: 'length', from: list})
            : '#length'),
      }),
    },

    {
      dependencies: [input('list')],
      compute: (continuation, {
        [input('list')]: list,
      }) => continuation({
        ['#value']:
          (list === null
            ? null
            : list.length),
      }),
    },

    {
      dependencies: ['#output', '#value'],

      compute: (continuation, {
        ['#output']: output,
        ['#value']: value,
      }) => continuation({
        [output]: value,
      }),
    },
  ],
});
