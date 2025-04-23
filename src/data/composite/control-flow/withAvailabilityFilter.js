// Performs the same availability check across all items of a list, providing
// a list that's suitable anywhere a filter is expected.
//
// Accepts the same mode options as withResultOfAvailabilityCheck.
//
// See also:
//  - flipFilter
//  - withFilteredList
//  - withResultOfAvailabilityCheck
//

import {input, templateCompositeFrom} from '#composite';

import inputAvailabilityCheckMode from './inputAvailabilityCheckMode.js';

import performAvailabilityCheck from './helpers/performAvailabilityCheck.js';

export default templateCompositeFrom({
  annotation: `withAvailabilityFilter`,

  inputs: {
    from: input({type: 'array'}),
    mode: inputAvailabilityCheckMode(),
  },

  outputs: ['#availabilityFilter'],

  steps: () => [
    {
      dependencies: [input('from'), input('mode')],
      compute: (continuation, {
        [input('from')]: list,
        [input('mode')]: mode,
      }) => continuation({
        ['#availabilityFilter']:
          list.map(value =>
            performAvailabilityCheck(value, mode)),
      }),
    },
  ],
});
