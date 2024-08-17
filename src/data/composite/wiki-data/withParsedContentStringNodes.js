// Runs the replacer's `parseInput` function on the provided content string,
// turning it into an AST (nowadays only flat) for data processing or treatment
// in content code.
//
// If the content string is null or blank, #parsedContentStringNodes will be
// an empty array - not null.

import {input, templateCompositeFrom} from '#composite';
import {parseInput} from '#replacer';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

export default templateCompositeFrom({
  annotation: `withResolvedContentStringNodes`,

  inputs: {
    from: input({type: 'string', acceptsNull: true}),
  },

  outputs: ['#parsedContentStringNodes'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: input('from'),
      output: input.value({
        ['#parsedContentStringNodes']: [],
      }),
    }),

    {
      dependencies: [input('from')],
      compute: (continuation, {
        [input('from')]: string,
      }) => continuation({
        ['#parsedContentStringNodes']:
          parseInput(string),
      }),
    },
  ],
});
