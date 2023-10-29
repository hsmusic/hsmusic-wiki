// Replaces items of a list, which are null or undefined, with some fallback
// value. By default, this replaces the passed dependency.
//
// See also:
//  - excludeFromList
//
// More list utilities:
//  - withFlattenedList
//  - withPropertyFromList
//  - withPropertiesFromList
//  - withUnflattenedList
//

import {input, templateCompositeFrom} from '#composite';

export default templateCompositeFrom({
  annotation: `fillMissingListItems`,

  inputs: {
    list: input({type: 'array'}),
    fill: input({acceptsNull: true}),
  },

  outputs: ({
    [input.staticDependency('list')]: list,
  }) => [list ?? '#list'],

  steps: () => [
    {
      dependencies: [input('list'), input('fill')],
      compute: (continuation, {
        [input('list')]: list,
        [input('fill')]: fill,
      }) => continuation({
        ['#filled']:
          list.map(item => item ?? fill),
      }),
    },

    {
      dependencies: [input.staticDependency('list'), '#filled'],
      compute: (continuation, {
        [input.staticDependency('list')]: list,
        ['#filled']: filled,
      }) => continuation({
        [list ?? '#list']:
          filled,
      }),
    },
  ],
});
