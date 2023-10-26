// Gets a property from each of a list of objects (in a dependency) and
// provides the results.
//
// This doesn't alter any list indices, so positions which were null in the
// original list are kept null here. Objects which don't have the specified
// property are retained in-place as null.
//
// See also:
//  - withPropertiesFromList
//  - withPropertyFromObject
//
// More list utilities:
//  - excludeFromList
//  - fillMissingListItems
//  - withFlattenedList
//  - withUnflattenedList
//

import {input, templateCompositeFrom} from '#composite';

function getOutputName({list, property, prefix}) {
  if (!property) return `#values`;
  if (prefix) return `${prefix}.${property}`;
  if (list) return `${list}.${property}`;
  return `#list.${property}`;
}

export default templateCompositeFrom({
  annotation: `withPropertyFromList`,

  inputs: {
    list: input({type: 'array'}),
    property: input({type: 'string'}),
    prefix: input.staticValue({type: 'string', defaultValue: null}),
  },

  outputs: ({
    [input.staticDependency('list')]: list,
    [input.staticValue('property')]: property,
    [input.staticValue('prefix')]: prefix,
  }) =>
    [getOutputName({list, property, prefix})],

  steps: () => [
    {
      dependencies: [input('list'), input('property')],
      compute: (continuation, {
        [input('list')]: list,
        [input('property')]: property,
      }) => continuation({
        ['#values']:
          list.map(item => item[property] ?? null),
      }),
    },

    {
      dependencies: [
        input.staticDependency('list'),
        input.staticValue('property'),
        input.staticValue('prefix'),
      ],

      compute: (continuation, {
        [input.staticDependency('list')]: list,
        [input.staticValue('property')]: property,
        [input.staticValue('prefix')]: prefix,
      }) => continuation({
        ['#outputName']:
          getOutputName({list, property, prefix}),
      }),
    },

    {
      dependencies: ['#values', '#outputName'],
      compute: (continuation, {
        ['#values']: values,
        ['#outputName']: outputName,
      }) =>
        continuation.raiseOutput({[outputName]: values}),
    },
  ],
});
