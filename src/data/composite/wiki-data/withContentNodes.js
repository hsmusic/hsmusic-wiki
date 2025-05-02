import {input, templateCompositeFrom} from '#composite';
import {parseContentNodes} from '#replacer';

export default templateCompositeFrom({
  annotation: `withContentNodes`,

  inputs: {
    from: input({type: 'string', acceptsNull: false}),
  },

  outputs: ['#contentNodes'],

  steps: () => [
    {
      dependencies: [input('from')],

      compute: (continuation, {
        [input('from')]: string,
      }) => continuation({
        ['#contentNodes']:
          parseContentNodes(string),
      }),
    },
  ],
});
