// Checks the availability of a dependency and provides the result to later
// steps under '#availability' (by default). This is mainly intended for use
// by the more specific utilities, which you should consider using instead.
//
// Customize {mode} to select one of these modes, or default to 'null':
//
// * 'null':  Check that the value isn't null (and not undefined either).
// * 'empty': Check that the value is neither null, undefined, nor an empty
//            array.
// * 'falsy': Check that the value isn't false when treated as a boolean
//            (nor an empty array). Keep in mind this will also be false
//            for values like zero and the empty string!
//
// See also:
//  - exitWithoutDependency
//  - exitWithoutUpdateValue
//  - exposeDependencyOrContinue
//  - exposeUpdateValueOrContinue
//  - raiseOutputWithoutDependency
//  - raiseOutputWithoutUpdateValue
//

import {input, templateCompositeFrom} from '#composite';
import {empty} from '#sugar';

import inputAvailabilityCheckMode from './inputAvailabilityCheckMode.js';

export default templateCompositeFrom({
  annotation: `withResultOfAvailabilityCheck`,

  inputs: {
    from: input({acceptsNull: true}),
    mode: inputAvailabilityCheckMode(),
  },

  outputs: ['#availability'],

  steps: () => [
    {
      dependencies: [input('from'), input('mode')],

      compute: (continuation, {
        [input('from')]: value,
        [input('mode')]: mode,
      }) => {
        let availability;

        switch (mode) {
          case 'null':
            availability = value !== undefined && value !== null;
            break;

          case 'empty':
            availability = value !== undefined && !empty(value);
            break;

          case 'falsy':
            availability = !!value && (!Array.isArray(value) || !empty(value));
            break;
        }

        return continuation({'#availability': availability});
      },
    },
  ],
});
