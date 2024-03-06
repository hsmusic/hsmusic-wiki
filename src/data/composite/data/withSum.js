// Gets the numeric total of adding all the values in a list together.
// Values that are false, null, or undefined are skipped over.

import {input, templateCompositeFrom} from '#composite';
import {isNumber, sparseArrayOf} from '#validators';

export default templateCompositeFrom({
  annotation: `withSum`,

  inputs: {
    values: input({
      validate: sparseArrayOf(isNumber),
    }),
  },

  outputs: ['#sum'],

  steps: () => [
    {
      dependencies: [input('values')],
      compute: (continuation, {
        [input('values')]: values,
      }) => continuation({
        ['#sum']:
          values
            .filter(item => typeof item === 'number')
            .reduce(
              (accumulator, value) => accumulator + value,
              0),
      }),
    },
  ],
});
