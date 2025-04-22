import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';
import {withRecontextualizedContributionList} from '#composite/wiki-data';

import withPropertyFromMainArtwork from './withPropertyFromMainArtwork.js';

export default templateCompositeFrom({
  annotaion: `withContribsFromMainArtwork`,

  outputs: ['#mainArtwork.artistContribs'],

  steps: () => [
    withPropertyFromMainArtwork({
      property: input.value('artistContribs'),
      onlyIfAttached: input.value(true),
    }),

    raiseOutputWithoutDependency({
      dependency: '#mainArtwork.artistContribs',
      output: input.value({'#mainArtwork.artistContribs': null}),
    }),

    withRecontextualizedContributionList({
      list: '#mainArtwork.artistContribs',
    }),
  ],
});
