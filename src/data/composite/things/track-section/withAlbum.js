// Gets the track section's album. This will early exit if ownAlbumData is
// missing. If there's no album whose list of track sections includes this one,
// the output dependency will be null.

import {input, templateCompositeFrom} from '#composite';

import {withUniqueReferencingThing} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withAlbum`,

  outputs: ['#album'],

  steps: () => [
    withUniqueReferencingThing({
      data: 'ownAlbumData',
      list: input.value('trackSections'),
    }).outputs({
      ['#uniqueReferencingThing']: '#album',
    }),
  ],
});
