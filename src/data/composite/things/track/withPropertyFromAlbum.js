// Gets a single property from this track's album, providing it as the same
// property name prefixed with '#album.' (by default). If the track's album
// isn't available, then by default, the property will be provided as null;
// set {notFoundMode: 'exit'} to early exit instead.

import {input, templateCompositeFrom} from '#composite';
import {is} from '#validators';

import {withPropertyFromObject} from '#composite/data';

import withAlbum from './withAlbum.js';

export default templateCompositeFrom({
  annotation: `withPropertyFromAlbum`,

  inputs: {
    property: input.staticValue({type: 'string'}),

    notFoundMode: input({
      validate: is('exit', 'null'),
      defaultValue: 'null',
    }),
  },

  outputs: ({
    [input.staticValue('property')]: property,
  }) => ['#album.' + property],

  steps: () => [
    withAlbum({
      notFoundMode: input('notFoundMode'),
    }),

    withPropertyFromObject({
      object: '#album',
      property: input('property'),
    }),

    {
      dependencies: ['#value', input.staticValue('property')],
      compute: (continuation, {
        ['#value']: value,
        [input.staticValue('property')]: property,
      }) => continuation({
        ['#album.' + property]: value,
      }),
    },
  ],
});
