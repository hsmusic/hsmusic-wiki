// Select a directory, either using a manually specified directory, or
// computing it from a name. By default these values are the current thing's
// 'directory' and 'name' properties, so it can be used without any options
// to get the current thing's effective directory (assuming no custom rules).

import {input, templateCompositeFrom} from '#composite';

import {isDirectory, isName} from '#validators';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

import withSimpleDirectory from './helpers/withSimpleDirectory.js';

export default templateCompositeFrom({
  annotation: `withDirectory`,

  inputs: {
    directory: input({
      validate: isDirectory,
      defaultDependency: '_directory',
      acceptsNull: true,
    }),

    name: input({
      validate: isName,
      defaultDependency: '_name',
      acceptsNull: true,
    }),

    suffix: input({
      validate: isDirectory,
      defaultValue: null,
    }),
  },

  outputs: ['#directory'],

  steps: () => [
    withSimpleDirectory({
      directory: input('directory'),
      name: input('name'),
    }),

    raiseOutputWithoutDependency({
      dependency: '#directory',
      output: input.value({['#directory']: null}),
    }),

    {
      dependencies: ['#directory', input('suffix')],
      compute: (continuation, {
        ['#directory']: directory,
        [input('suffix')]: suffix,
      }) => continuation({
        ['#directory']:
          (suffix
            ? directory + '-' + suffix
            : directory),
      }),
    },
  ],
});
