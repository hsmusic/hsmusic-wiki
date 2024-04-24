import {input, templateCompositeFrom} from '#composite';

import {withFilteredList, withMappedList, withPropertyFromList} from '#composite/data';
import {withReverseReferenceList} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withGuestTracks`,

  outputs: ['#guestTracks'],

  steps: () => [
    withReverseReferenceList({
      data: 'trackData',
      list: input.value('groups'),
    }).outputs({
      ['#reverseReferenceList']: '#tracks',
    }),

    withPropertyFromList({
      list: '#tracks',
      property: input.value('album'),
    }),

    withPropertyFromList({
      list: '#tracks.album',
      property: input.value('groups'),
    }),

    {
      dependencies: [input.myself()],
      compute: (continuation, {
        [input.myself()]: myself,
      }) => continuation({
        ['#map']:
          groups => !groups.includes(myself),
      }),
    },

    withMappedList({
      list: '#tracks.album.groups',
      map: '#map',
    }).outputs({
      ['#mappedList']: '#filter',
    }),

    withFilteredList({
      list: '#tracks',
      filter: '#filter',
    }).outputs({
      ['#filteredList']: '#guestTracks',
    }),
  ],
});
