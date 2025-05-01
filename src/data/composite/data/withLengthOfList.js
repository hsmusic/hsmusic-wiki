import {input, templateCompositeFrom} from '#composite';
import {stitchArrays} from '#sugar';

function getOutputName({
  [input.staticDependency('list')]: list,
}) {
  if (list && list.startsWith('#')) {
    return `${list}.length`;
  } else if (list) {
    return `#${list}.length`;
  } else {
    return '#length';
  }
}

export default templateCompositeFrom({
  annotation: `withMappedList`,

  inputs: {
    list: input({type: 'array'}),
  },

  outputs: inputs => [getOutputName(inputs)],

  steps: () => [
    {
      dependencies: [input.staticDependency('list')],
      compute: (continuation, inputs) =>
        continuation({'#output': getOutputName(inputs)}),
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
