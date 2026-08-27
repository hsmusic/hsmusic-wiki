import {input, V} from '#composite';
import find from '#find';
import Thing from '#thing';

import {exitWithoutUpdateValue, exposeConstant} from '#composite/control-flow';
import {withIndexInList, withPropertyFromObject} from '#composite/data';
import {withResolvedReference} from '#composite/wiki-data';

import {Artwork} from './Artwork.js';

export class TrackArtwork extends Artwork {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    mainArtwork: [
      exitWithoutUpdateValue(),

      withPropertyFromObject('thing', V('mainReleaseTrack')),
      withPropertyFromObject('thing', V('trackArtworks')),
      withPropertyFromObject('#thing.mainReleaseTrack', V('trackArtworks')),

      withIndexInList('#thing.trackArtworks', input.myself())
        .outputs({'#index': '#indexInOwnArtworks'}),

      {
        dependencies: [
          '#thing.mainReleaseTrack.trackArtworks',
          '#indexInOwnArtworks',
        ],

        transform: (value, continuation, {
          ['#thing.mainReleaseTrack.trackArtworks']: mainReleaseArtworks,
          ['#indexInOwnArtworks']: indexInOwnArtworks,
        }) =>
          (value === 'main release'
            ? mainReleaseArtworks[indexInOwnArtworks] ?? null
            : continuation()),
      },

      // STUB, SORRY :)
      exposeConstant(V(null)),
    ],

    // Expose only

    isTrackArtwork: exposeConstant(V(true)),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Reuse From': {property: 'mainArtwork'},
    },
  };
}
