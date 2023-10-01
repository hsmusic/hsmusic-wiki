// Gets the listed properties from each of a list of objects, providing lists
// of property values each into a dependency prefixed with the same name as the
// list (by default).
//
// Like withPropertyFromList, this doesn't alter indices.
//
// See also:
//  - withPropertiesFromObject
//  - withPropertyFromList
//
// More list utilities:
//  - excludeFromList
//  - fillMissingListItems
//  - withFlattenedList
//  - withUnflattenedList
//

import {input, templateCompositeFrom} from '#composite';
import {isString, validateArrayItems} from '#validators';

export default templateCompositeFrom({
  annotation: `withPropertiesFromList`,

  inputs: {
    list: input({type: 'array'}),

    properties: input({
      validate: validateArrayItems(isString),
    }),

    prefix: input.staticValue({type: 'string', defaultValue: null}),
  },

  outputs: ({
    [input.staticDependency('list')]: list,
    [input.staticValue('properties')]: properties,
    [input.staticValue('prefix')]: prefix,
  }) =>
    (properties
      ? properties.map(property =>
          (prefix
            ? `${prefix}.${property}`
         : list
            ? `${list}.${property}`
            : `#list.${property}`))
      : ['#lists']),

  steps: () => [
    {
      dependencies: [input('list'), input('properties')],
      compute: (continuation, {
        [input('list')]: list,
        [input('properties')]: properties,
      }) => continuation({
        ['#lists']:
          Object.fromEntries(
            properties.map(property => [
              property,
              list.map(item => item[property] ?? null),
            ])),
      }),
    },

    {
      dependencies: [
        input.staticDependency('list'),
        input.staticValue('properties'),
        input.staticValue('prefix'),
        '#lists',
      ],

      compute: (continuation, {
        [input.staticDependency('list')]: list,
        [input.staticValue('properties')]: properties,
        [input.staticValue('prefix')]: prefix,
        ['#lists']: lists,
      }) =>
        (properties
          ? continuation(
              Object.fromEntries(
                properties.map(property => [
                  (prefix
                    ? `${prefix}.${property}`
                 : list
                    ? `${list}.${property}`
                    : `#list.${property}`),
                  lists[property],
                ])))
          : continuation({'#lists': lists})),
    },
  ],
});
