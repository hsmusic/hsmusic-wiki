// Infers additional name entries from other releases that were titled
// differently; the corresponding releases are stored in eacn entry's "from"
// array, which will include multiple items, if more than one other release
// shares the same name differing from this one's.

import {input, templateCompositeFrom} from '#composite';
import {chunkByProperties} from '#sugar';

import {exitWithoutDependency} from '#composite/control-flow';
import {withFilteredList, withPropertyFromList} from '#composite/data';
import {withThingsSortedAlphabetically} from '#composite/wiki-data';

import withOtherReleases from './withOtherReleases.js';

export default templateCompositeFrom({
  annotation: `inferredAdditionalNameList`,

  compose: false,

  steps: () => [
    withOtherReleases(),

    exitWithoutDependency({
      dependency: '#otherReleases',
      mode: input.value('empty'),
      value: input.value([]),
    }),

    withPropertyFromList({
      list: '#otherReleases',
      property: input.value('name'),
    }),

    {
      dependencies: ['#otherReleases.name', 'name'],
      compute: (continuation, {
        ['#otherReleases.name']: releaseNames,
        ['name']: ownName,
      }) => continuation({
        ['#nameFilter']:
          releaseNames.map(name => name !== ownName),
      }),
    },

    withFilteredList({
      list: '#otherReleases',
      filter: '#nameFilter',
    }).outputs({
      '#filteredList': '#differentlyNamedReleases',
    }),

    withThingsSortedAlphabetically({
      things: '#differentlyNamedReleases',
    }).outputs({
      '#sortedThings': '#differentlyNamedReleases',
    }),

    {
      dependencies: ['#differentlyNamedReleases'],
      compute: ({
        ['#differentlyNamedReleases']: releases,
      }) =>
        chunkByProperties(releases, ['name'])
          .map(({name, chunk}) => ({name, from: chunk})),
    },
  ],
});
