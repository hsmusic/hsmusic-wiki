// Gets the listed properties from some object, providing each property's value
// as a dependency prefixed with the same name as the object (by default).
// If the object itself is null, all provided dependencies will be null;
// if it's missing only select properties, those will be provided as null.
//
// See also:
//  - withPropertiesFromList
//  - withPropertyFromObject
//

import {input, templateCompositeFrom} from '#composite';
import {isString, validateArrayItems} from '#validators';

import {getOutputName} from './helpers/property-from-helpers.js';

export default templateCompositeFrom({
  annotation: `withPropertiesFromObject`,

  inputs: {
    object: input({type: 'object', acceptsNull: true}),

    properties: input({
      type: 'array',
      validate: validateArrayItems(isString),
    }),

    prefix: input.staticValue({type: 'string', defaultValue: null}),
  },

  outputs: ({
    [input.staticDependency('object')]: object,
    [input.staticValue('properties')]: properties,
    [input.staticValue('prefix')]: prefix,
  }) =>
    (properties
      ? properties.map(property =>
          getOutputName({property, from: object || '#object', prefix}))
      : ['#object']),

  steps: () => [
    {
      dependencies: [input('object'), input('properties')],
      compute: (continuation, {
        [input('object')]: object,
        [input('properties')]: properties,
      }) => continuation({
        ['#entries']:
          (object === null
            ? properties.map(property => [property, null])
            : properties.map(property => [property, object[property]])),
      }),
    },

    {
      dependencies: [
        input.staticDependency('object'),
        input.staticValue('properties'),
        input.staticValue('prefix'),
        '#entries',
      ],

      compute: (continuation, {
        [input.staticDependency('object')]: object,
        [input.staticValue('properties')]: properties,
        [input.staticValue('prefix')]: prefix,
        ['#entries']: entries,
      }) =>
        (properties
          ? continuation(
              Object.fromEntries(
                entries.map(([property, value]) => [
                  getOutputName({property, from: object || '#object', prefix}),
                  value ?? null,
                ])))
          : continuation({
              ['#object']:
                Object.fromEntries(entries),
            })),
    },
  ],
});
