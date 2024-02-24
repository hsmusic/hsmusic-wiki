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
        const originalIndices =
          Array.from({length: list.length}, (_, index) => index);

        const symbols = [];
        const symbolToIndex = new Map();
        const indexToSymbol = new Map();

        for (const index of originalIndices) {
          const symbol = Symbol();
          symbols.push(symbol);
          symbolToIndex.set(symbol, index);
          indexToSymbol.set(index, symbol);
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

        const symbolToStable = new Map();
        const stableSortIndices = [];
        const sortedList = [];

        for (const [stableIndex, symbol] of symbols.entries()) {
          const sourceIndex = symbolToIndex.get(symbol);
          stableSortIndices.push(sourceIndex);
          symbolToStable.set(symbol, stableIndex);
          sortedList.push(list[sourceIndex]);
        }

        const push = (array, value) => {
          array.push(value);
          return array;
        };

        const stableToUnstable =
          symbols.reduce(
            (accumulator, current, index) =>
              (index === 0
                ? push(accumulator, 0)
                : (isEqual(current, symbols[index - 1])
                    ? push(accumulator, accumulator.at(-1))
                    : push(accumulator, accumulator.at(-1) + 1))),
            []);

        const unstableSortIndices =
          originalIndices
            .map(index => indexToSymbol.get(index))
            .map(symbol => symbolToStable.get(symbol))
            .map(stable => stableToUnstable[stable]);

        return continuation({
          ['#sortedList']: sortedList,
          ['#sortIndices']: stableSortIndices,
          ['#unstableSortIndices']: unstableSortIndices,
        });
      },
    },
  ],
});
