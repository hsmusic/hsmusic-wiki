// Gets a property of some object (in a dependency) and provides that value.
// If the object itself is null, or the object doesn't have the listed property,
// the provided dependency will also be null.
//
// See also:
//  - withPropertiesFromObject
//  - withPropertyFromList
//

import {input, templateCompositeFrom} from '#composite';

export default templateCompositeFrom({
  annotation: `withPropertyFromObject`,

  inputs: {
    object: input({type: 'object', acceptsNull: true}),
    property: input({type: 'string'}),
  },

  outputs: ({
    [input.staticDependency('object')]: object,
    [input.staticValue('property')]: property,
  }) =>
    (object && property
      ? (object.startsWith('#')
          ? [`${object}.${property}`]
          : [`#${object}.${property}`])
      : ['#value']),

  steps: () => [
    {
      dependencies: [
        input.staticDependency('object'),
        input.staticValue('property'),
      ],

      compute: (continuation, {
        [input.staticDependency('object')]: object,
        [input.staticValue('property')]: property,
      }) => continuation({
        '#output':
          (object && property
            ? (object.startsWith('#')
                ? `${object}.${property}`
                : `#${object}.${property}`)
            : '#value'),
      }),
    },

    {
      dependencies: [
        '#output',
        input('object'),
        input('property'),
      ],

      compute: (continuation, {
        ['#output']: output,
        [input('object')]: object,
        [input('property')]: property,
      }) => continuation({
        [output]:
          (object === null
            ? null
            : object[property] ?? null),
      }),
    },
  ],
});
