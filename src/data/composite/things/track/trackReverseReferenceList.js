// Like a normal reverse reference list ("objects which reference this object
// under a specified property"), only excluding re-releases from the possible
// outputs. While it's useful to travel from a re-release to the tracks it
// references, re-releases aren't generally relevant from the perspective of
// the tracks *being* referenced. Apart from hiding re-releases from lists on
// the site, it also excludes keeps them from relational data processing, such
// as on the "Tracks - by Times Referenced" listing page.

import {input, templateCompositeFrom} from '#composite';
import {withReverseReferenceList} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `trackReverseReferenceList`,

  compose: false,

  inputs: {
    list: input({type: 'string'}),
  },

  steps: () => [
    withReverseReferenceList({
      data: 'trackData',
      list: input('list'),
    }),

    {
      flags: {expose: true},
      expose: {
        dependencies: ['#reverseReferenceList'],
        compute: ({
          ['#reverseReferenceList']: reverseReferenceList,
        }) =>
          reverseReferenceList.filter(track => !track.originalReleaseTrack),
      },
    },
  ],
});
