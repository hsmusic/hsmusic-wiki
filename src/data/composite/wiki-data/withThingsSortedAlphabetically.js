// Sorts a list of live, generic wiki data objects alphabetically.
// Note that this uses localeCompare but isn't specialized to a particular
// language; where localization is concerned (in content), a follow-up, locale-
// specific sort should be performed. But this function does serve to organize
// a list so same-name entries are beside each other.

import {input, templateCompositeFrom} from '#composite';
import {validateWikiData} from '#validators';
import {compareCaseLessSensitive, normalizeName} from '#wiki-data';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withMappedList, withSortedList, withPropertiesFromList}
  from '#composite/data';

export default templateCompositeFrom({
  annotation: `withThingsSortedAlphabetically`,

  inputs: {
    things: input({validate: validateWikiData}),
  },

  outputs: ['#sortedThings'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: input('things'),
      mode: input.value('empty'),
      output: input.value({'#sortedThings': []}),
    }),

    withPropertiesFromList({
      list: input('things'),
      properties: input.value(['name', 'directory']),
    }).outputs({
      '#list.name': '#names',
      '#list.directory': '#directories',
    }),

    withMappedList({
      list: '#names',
      map: input.value(normalizeName),
    }).outputs({
      '#mappedList': '#normalizedNames',
    }),

    withSortedList({
      list: '#normalizedNames',
      sort: input.value(compareCaseLessSensitive),
    }).outputs({
      '#unstableSortIndices': '#normalizedNameSortIndices',
    }),

    withSortedList({
      list: '#names',
      sort: input.value(compareCaseLessSensitive),
    }).outputs({
      '#unstableSortIndices': '#nonNormalizedNameSortIndices',
    }),

    withSortedList({
      list: '#directories',
      sort: input.value(compareCaseLessSensitive),
    }).outputs({
      '#unstableSortIndices': '#directorySortIndices',
    }),

    // TODO: No primitive for the next two-three steps, yet...

    {
      dependencies: [input('things')],
      compute: (continuation, {
        [input('things')]: things,
      }) => continuation({
        ['#combinedSortIndices']:
          Array.from(
            {length: things.length},
            (_item, index) => index),
      }),
    },

    {
      dependencies: [
        '#combinedSortIndices',
        '#normalizedNameSortIndices',
        '#nonNormalizedNameSortIndices',
        '#directorySortIndices',
      ],

      compute: (continuation, {
        ['#combinedSortIndices']: combined,
        ['#normalizedNameSortIndices']: normalized,
        ['#nonNormalizedNameSortIndices']: nonNormalized,
        ['#directorySortIndices']: directory,
      }) => continuation({
        ['#combinedSortIndices']:
          combined.sort((index1, index2) => {
            if (normalized[index1] !== normalized[index2])
              return normalized[index1] - normalized[index2];

            if (nonNormalized[index1] !== nonNormalized[index2])
              return nonNormalized[index1] - nonNormalized[index2];

            if (directory[index1] !== directory[index2])
              return directory[index1] - directory[index2];

            return 0;
          }),
      }),
    },

    {
      dependencies: [input('things'), '#combinedSortIndices'],
      compute: (continuation, {
        [input('things')]: things,
        ['#combinedSortIndices']: combined,
      }) => continuation({
        ['#sortedThings']:
          combined.map(index => things[index]),
      }),
    },
  ],
});
