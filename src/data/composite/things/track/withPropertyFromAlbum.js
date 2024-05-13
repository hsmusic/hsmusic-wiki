// Gets a single property from this track's album, providing it as the same
// property name prefixed with '#album.' (by default).

import {input, templateCompositeFrom} from '#composite';

import {withPropertyFromObject} from '#composite/data';

import withAlbum from './withAlbum.js';

export default templateCompositeFrom({
  annotation: `withPropertyFromAlbum`,

  inputs: {
    property: input.staticValue({type: 'string'}),
  },

  outputs: ({
    [input.staticValue('property')]: property,
  }) => ['#album.' + property],

  steps: () => [
    withAlbum(),

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
