// Gets a property of some object (in a dependency) and provides that value.
// If the object itself is null, or the object doesn't have the listed property,
// the provided dependency will also be null.
//
// If the `internal` input is true, this reads the CacheableObject update value
// of the object rather than its exposed value.
//
// See also:
//  - withPropertiesFromObject
//  - withPropertyFromList
//

import CacheableObject from '#cacheable-object';
import {input, templateCompositeFrom} from '#composite';

export default templateCompositeFrom({
  annotation: `withPropertyFromObject`,

  inputs: {
    object: input({type: 'object', acceptsNull: true}),
    property: input({type: 'string'}),
    internal: input({type: 'boolean', defaultValue: false}),
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
        input('object'),
        input('property'),
        input('internal'),
      ],

      compute: (continuation, {
        [input('object')]: object,
        [input('property')]: property,
        [input('internal')]: internal,
      }) => continuation({
        '#value':
          (object === null
            ? null
         : internal
            ? CacheableObject.getUpdateValue(object, property)
                ?? null
            : object[property]
                ?? null),
      }),
    },

    {
      dependencies: ['#output', '#value'],

      compute: (continuation, {
        ['#output']: output,
        ['#value']: value,
      }) => continuation({
        [output]: value,
      }),
    },
  ],
});
