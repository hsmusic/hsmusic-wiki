import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';
import {withRecontextualizedContributionList} from '#composite/wiki-data';

import withPropertyFromAttachedArtwork from './withPropertyFromAttachedArtwork.js';

export default templateCompositeFrom({
  annotaion: `withContribsFromAttachedArtwork`,

  outputs: ['#attachedArtwork.artistContribs'],

  steps: () => [
    withPropertyFromAttachedArtwork({
      property: input.value('artistContribs'),
    }),

    raiseOutputWithoutDependency({
      dependency: '#attachedArtwork.artistContribs',
      output: input.value({'#attachedArtwork.artistContribs': null}),
    }),

    withRecontextualizedContributionList({
      list: '#attachedArtwork.artistContribs',
    }),
  ],
});
