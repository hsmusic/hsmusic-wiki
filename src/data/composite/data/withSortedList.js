// Applies a sort function across pairs of items in a list, just like a normal
// JavaScript sort. Alongside the sorted results, so are outputted the indices
// which each item in the unsorted list corresponds to in the sorted one,
// allowing for the results of this sort to be composed in some more involved
// operation. For example, using an alphabetical sort, the list ['banana',
// 'apple', 'pterodactyl'] will output the expected alphabetical items, as well
// as the indices list [1, 0, 2].
//
// If two items are equal (in the eyes of the sort operation), their placement
// in the sorted list is arbitrary, though every input index will be present in
// '#sortIndices' exactly once (and equal items will be bunched together).
//
// The '#sortIndices' output refers to the "true" index which each source item
// occupies in the sorted list. This sacrifices information about equal items,
// which can be obtained through '#unstableSortIndices' instead: each mapped
// index may appear more than once, and rather than represent exact positions
// in the sorted list, they represent relational values: if items A and B are
// mapped to indices 3 and 5, then A certainly is positioned before B (and vice
// versa); but there may be more than one item in-between. If items C and D are
// both mapped to index 4, then their position relative to each other is
// arbitrary - they are equal - but they both certainly appear after item A and
// before item B.
//
// This implementation is based on the one used for sortMultipleArrays.
//
// See also:
//  - withFilteredList
//  - withMappedList
//
// More list utilities:
//  - excludeFromList
//  - fillMissingListItems
//  - withFlattenedList, withUnflattenedList
//  - withPropertyFromList, withPropertiesFromList
//

import {input, templateCompositeFrom} from '#composite';
import {empty} from '#sugar';

export default templateCompositeFrom({
  annotation: `withSortedList`,

  inputs: {
    list: input({type: 'array'}),
    sort: input({type: 'function'}),
  },

  outputs: ['#sortedList', '#sortIndices', '#unstableSortIndices'],

  steps: () => [
    {
      dependencies: [input('list'), input('sort')],
      compute(continuation, {
        [input('list')]: list,
        [input('sort')]: sortFn,
      }) {
        const symbols = [];
        const symbolToIndex = new Map();

        for (const index of list.keys()) {
          const symbol = Symbol();
          symbols.push(symbol);
          symbolToIndex.set(symbol, index);
        }

        const equalSymbols = new Map();

        const assertEqual = (symbol1, symbol2) => {
          if (equalSymbols.has(symbol1)) {
            equalSymbols.get(symbol1).add(symbol2);
          } else {
            equalSymbols.set(symbol1, new Set([symbol2]));
          }
        };

        const isEqual = (symbol1, symbol2) =>
          !!equalSymbols.get(symbol1)?.has(symbol2);

        symbols.sort((symbol1, symbol2) => {
          const comparison =
            sortFn(
              list[symbolToIndex.get(symbol1)],
              list[symbolToIndex.get(symbol2)]);

          if (comparison === 0) {
            assertEqual(symbol1, symbol2);
            assertEqual(symbol2, symbol1);
          }

          return comparison;
        });

        const stableSortIndices = [];
        const unstableSortIndices = [];
        const sortedList = [];

        let unstableIndex = 0;

        for (const [stableIndex, symbol] of symbols.entries()) {
          const sourceIndex = symbolToIndex.get(symbol);
          stableSortIndices.push(sourceIndex);
          sortedList.push(list[sourceIndex]);

          if (stableIndex > 0) {
            const previous = symbols[stableIndex - 1];
            if (!isEqual(symbol, previous)) {
              unstableIndex++;
            }
          }

          unstableSortIndices[sourceIndex] = unstableIndex;
        }

        return continuation({
          ['#sortedList']: sortedList,
          ['#sortIndices']: stableSortIndices,
          ['#unstableSortIndices']: unstableSortIndices,
        });
      },
    },
  ],
});
