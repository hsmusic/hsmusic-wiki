import {inspect} from 'node:util';

import {V} from '#composite';
import find from '#find';
import Thing from '#thing';

import {exposeConstant} from '#composite/control-flow';
import {singleReference, soupyFind} from '#composite/wiki-properties';

import {Artwork} from './Artwork.js';

export class TrackArtwork extends Artwork {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    mainArtwork: singleReference({
      find: soupyFind.input('trackArtworkMainArtwork'),
    }),

    // Expose only

    isTrackArtwork: exposeConstant(V(true)),
  });

  static [Thing.findSpecs] = {
    trackArtworkMainArtwork: {
      referenceTypes: ['track'],
      bindTo: 'trackData',

      byob(fullRef, data, opts) {
        if (!opts.from?.isTrackArtwork) {
          throw new Error(
            `Expected to find starting from a track artwork, got: ` +
            inspect(opts.from, {compact: true}));
        }

        const fromArtwork = opts.from;
        const fromTrack = opts.from.thing;

        const toTrack =
          (fullRef === 'main release'
            ? fromTrack.mainReleaseTrack
            : find.track(fullRef, data, {...opts, mode: 'quiet'}));

        if (!toTrack) {
          return null;
        }

        const toArtwork =
          toTrack.trackArtworks.find(artwork =>
            artwork.label === fromArtwork.label &&
            artwork.unqualifiedDirectory === fromArtwork.unqualifiedDirectory);

        // This may be null, if no artwork on the target track matches the
        // directory and label of the artwork we're finding from.
        return toArtwork;
      },
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Reuse From': {property: 'mainArtwork'},
    },
  };
}
