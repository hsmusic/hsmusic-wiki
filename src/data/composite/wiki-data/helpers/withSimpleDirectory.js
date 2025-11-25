// A "simple" directory, based only on the already-provided directory, if
// available, or the provided name.

import {input, templateCompositeFrom} from '#composite';

import {isDirectory, isName} from '#validators';

import {withResultOfAvailabilityCheck} from '#composite/control-flow';

import withDirectoryFromName from './withDirectoryFromName.js';

export default templateCompositeFrom({
  annotation: `withSimpleDirectory`,

  inputs: {
    directory: input({
      validate: isDirectory,
      defaultDependency: '_directory',
      acceptsNull: true,
    }),

    name: input({
      validate: isName,
      acceptsNull: true,
    }),
  },

  outputs: ['#directory'],

  steps: () => [
    withResultOfAvailabilityCheck({
      from: input('directory'),
    }),

    {
      dependencies: ['#availability', input('directory')],
      compute: (continuation, {
        ['#availability']: availability,
        [input('directory')]: directory,
      }) =>
        (availability
          ? continuation.raiseOutput({
              ['#directory']: directory
            })
          : continuation()),
    },

    withDirectoryFromName({
      name: input('name'),
    }),
  ],
});
