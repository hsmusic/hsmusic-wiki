// Select a directory, either using a manually specified directory, or
// computing it from a name. By default these values are the current thing's
// 'directory' and 'name' properties, so it can be used without any options
// to get the current thing's effective directory (assuming no custom rules).

import {input, templateCompositeFrom} from '#composite';

import {isDirectory, isName} from '#validators';

import {withResultOfAvailabilityCheck} from '#composite/control-flow';

import withDirectoryFromName from './withDirectoryFromName.js';

export default templateCompositeFrom({
  annotation: `withDirectory`,

  inputs: {
    directory: input({
      validate: isDirectory,
      defaultDependency: 'directory',
      acceptsNull: true,
    }),

    name: input({
      validate: isName,
      defaultDependency: 'name',
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
