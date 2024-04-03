// Gets the track's album. This will early exit if albumData is missing.
// If there's no album whose list of tracks includes this track, the output
// dependency will be null.

import {input, templateCompositeFrom} from '#composite';

import {withUniqueReferencingThing} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withAlbum`,

  outputs: ['#album'],

  steps: () => [
    withUniqueReferencingThing({
      data: 'albumData',
      list: input.value('tracks'),
    }).outputs({
      ['#uniqueReferencingThing']: '#album',
    }),
  ],
});
