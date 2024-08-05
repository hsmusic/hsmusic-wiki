// Gets the track section's album.

import {input, templateCompositeFrom} from '#composite';

import {withUniqueReferencingThing} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withAlbum`,

  outputs: ['#album'],

  steps: () => [
    withUniqueReferencingThing({
      data: 'albumData',
      list: input.value('trackSections'),
    }).outputs({
      ['#uniqueReferencingThing']: '#album',
    }),
  ],
});
