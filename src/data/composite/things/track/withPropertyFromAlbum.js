// Gets a single property from this track's album, providing it as the same
// property name prefixed with '#album.' (by default).

import {input, templateCompositeFrom} from '#composite';

import {withPropertyFromObject} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withPropertyFromAlbum`,

  inputs: {
    property: input.staticValue({type: 'string'}),
    internal: input({type: 'boolean', defaultValue: false}),
  },

  outputs: ({
    [input.staticValue('property')]: property,
  }) => ['#album.' + property],

  steps: () => [
    // XXX: This is a ridiculous hack considering `defaultValue` above.
    // If we were certain what was up, we'd just get around to fixing it LOL
    {
      dependencies: [input('internal')],
      compute: (continuation, {
        [input('internal')]: internal,
      }) => continuation({
        ['#internal']: internal ?? false,
      }),
    },

    withPropertyFromObject({
      object: 'album',
      property: input('property'),
      internal: '#internal',
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
