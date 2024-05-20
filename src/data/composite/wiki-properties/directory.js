// The all-encompassing "directory" property, used as the unique identifier for
// almost any data object. Also corresponds to a part of the URL which pages of
// such objects are visited at.

import {input, templateCompositeFrom} from '#composite';

import {isDirectory, isName} from '#validators';

import {exposeDependency} from '#composite/control-flow';
import {withDirectory} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `directory`,

  compose: false,

  inputs: {
    name: input({
      validate: isName,
      defaultDependency: 'name',
    }),
  },

  steps: () => [
    withDirectory({
      directory: input.updateValue({validate: isDirectory}),
    }),

    exposeDependency({
      dependency: '#directory',
    }),
  ],
});
