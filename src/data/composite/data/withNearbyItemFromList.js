// Gets a nearby (typically adjacent) item in a list, meaning the item which is
// placed at a particular offset compared to the provided item. This is null if
// the provided list doesn't include the provided item at all, and also if the
// offset would read past either end of the list - except if configured:
//
//  - If the 'wrap' input is provided (as true), the offset will loop around
//    and continue from the opposing end.
//
//  - If the 'valuePastEdge' input is provided, that value will be output
//    instead of null.
//
// Both the list and item must be provided.
//
// See also:
//  - withIndexInList
//

import {input, templateCompositeFrom} from '#composite';
import {atOffset} from '#sugar';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

import withIndexInList from './withIndexInList.js';

export default templateCompositeFrom({
  annotation: `withNearbyItemFromList`,

  inputs: {
    list: input({acceptsNull: false, type: 'array'}),
    item: input({acceptsNull: false}),

    offset: input({type: 'number'}),
    wrap: input({type: 'boolean', defaultValue: false}),
  },

  outputs: ['#nearbyItem'],

  steps: () => [
    withIndexInList({
      list: input('list'),
      item: input('item'),
    }),

    raiseOutputWithoutDependency({
      dependency: '#index',
      mode: input.value('index'),

      output: input.value({
        ['#nearbyItem']:
          null,
      }),
    }),

    {
      dependencies: [
        input('list'),
        input('offset'),
        input('wrap'),
        '#index',
      ],

      compute: (continuation, {
        [input('list')]: list,
        [input('offset')]: offset,
        [input('wrap')]: wrap,
        ['#index']: index,
      }) => continuation({
        ['#nearbyItem']:
          atOffset(list, index, offset, {wrap}),
      }),
    },
  ],
});
