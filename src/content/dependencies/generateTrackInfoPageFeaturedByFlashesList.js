import {sortFlashesChronologically} from '#sort';
import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['linkFlash', 'linkTrack'],
  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({wikiInfo}) => ({
    enableFlashesAndGames:
      wikiInfo.enableFlashesAndGames,
  }),

  query: (sprawl, track) => ({
    sortedFeatures:
      (sprawl.enableFlashesAndGames
        ? sortFlashesChronologically(
            [track, ...track.otherReleases].flatMap(track =>
              track.featuredInFlashes.map(flash => ({
                flash,
                track,

                // These properties are only used for the sort.
                act: flash.act,
                date: flash.date,
              }))))
        : []),
  }),

  relations: (relation, query, _sprawl, track) => ({
    flashLinks:
      query.sortedFeatures
        .map(({flash}) => relation('linkFlash', flash)),

    trackLinks:
      query.sortedFeatures
        .map(({track: directlyFeaturedTrack}) =>
          (directlyFeaturedTrack === track
            ? null
            : relation('linkTrack', directlyFeaturedTrack))),
  }),

  generate: (relations, {html, language}) =>
    html.tag('ul',
      {[html.onlyIfContent]: true},

      stitchArrays({
        flashLink: relations.flashLinks,
        trackLink: relations.trackLinks,
      }).map(({flashLink, trackLink}) => {
          const attributes = html.attributes();
          const parts = ['releaseInfo.flashesThatFeature.item'];
          const options = {flash: flashLink};

          if (trackLink) {
            attributes.add('class', 'rerelease');
            parts.push('asDifferentRelease');
            options.track = trackLink;
          }

          return html.tag('li', attributes, language.$(...parts, options));
        })),
};
