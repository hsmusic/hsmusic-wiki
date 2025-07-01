import {input, templateCompositeFrom} from '#composite';
import {isContributionList, isThing, strictArrayOf} from '#validators';

import {exitWithoutDependency} from '#composite/control-flow';

import withHasArtwork from './withHasArtwork.js';

export default templateCompositeFrom({
  annotation: `exitWithoutArtwork`,

  inputs: {
    contribs: input({
      validate: isContributionList,
      defaultValue: null,
    }),

    artwork: input({
      validate: isThing,
      defaultValue: null,
    }),

    artworks: input({
      validate: strictArrayOf(isThing),
      defaultValue: null,
    }),

    value: input({
      defaultValue: null,
    }),
  },

  steps: () => [
    withHasArtwork({
      contribs: input('contribs'),
      artwork: input('artwork'),
      artworks: input('artworks'),
    }),

    exitWithoutDependency({
      dependency: '#hasArtwork',
      mode: input.value('falsy'),
      value: input('value'),
    }),
  ],
});
