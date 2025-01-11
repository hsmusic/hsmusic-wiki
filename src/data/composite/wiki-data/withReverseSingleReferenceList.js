// Like withReverseReferenceList, but for finding all things which reference
// the current thing by a property that contains a single reference, rather
// than within a reference list.

import withReverseList_template from './helpers/withReverseList-template.js';

import {input} from '#composite';

import {withAvailabilityFilter} from '#composite/control-flow';
import {withMappedList, withPropertyFromList} from '#composite/data';

export default withReverseList_template({
  annotation: `withReverseSingleReferenceList`,

  propertyInputName: 'ref',
  outputName: '#reverseSingleReferenceList',

  customCompositionSteps: () => [
    {
      dependencies: [input('data')],
      compute: (continuation, {
        [input('data')]: data,
      }) => continuation({
        ['#referencingThings']:
          data,
      }),
    },

    withPropertyFromList({
      list: '#referencingThings',
      property: input('ref'),
    }).outputs({
      '#values': '#individualReferencedThings',
    }),

    withAvailabilityFilter({
      from: '#individualReferencedThings',
    }),

    // This map wraps each referenced thing in a single-item array.
    // Each referencing thing references exactly one thing, if any.
    withMappedList({
      list: '#individualReferencedThings',
      filter: '#availabilityFilter',
      map: input.value(thing => [thing]),
    }).outputs({
      '#mappedList': '#referencedThings',
    }),
  ],
});
