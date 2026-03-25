import {stitchArrays} from '#sugar';

export default {
  relations: (relation, features, track) => ({
    flashLinks:
      features
        .map(({flash}) => relation('linkFlash', flash)),

    trackLinks:
      features
        .map(({as: directlyFeaturedTrack}) =>
          (directlyFeaturedTrack === track
            ? null
         : directlyFeaturedTrack.name === track.name
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
          const parts = ['flashList.item'];
          const options = {flash: flashLink};

          if (trackLink) {
            parts.push('asDifferentRelease');
            options.track = trackLink;
          }

          return html.tag('li', attributes, language.$(...parts, options));
        })),
};
