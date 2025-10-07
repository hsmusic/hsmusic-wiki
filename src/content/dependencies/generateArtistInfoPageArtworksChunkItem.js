import {empty} from '#sugar';

export default {
  query: (contrib) => ({
    kind:
      (contrib.thingProperty === 'bannerArtistContribs' ||
       (contrib.thing.isArtwork &&
        contrib.thing.thingProperty === 'bannerArtwork')
        ? 'banner'
     : contrib.thingProperty === 'wallpaperArtistContribs' ||
       (contrib.thing.isArtwork &&
        contrib.thing.thingProperty === 'wallpaperArtwork')
        ? 'wallpaper'
     : contrib.thing.isAlbum
        ? 'album-cover'
        : 'track-cover'),
  }),

  relations: (relation, query, contrib) => ({
    template:
      relation('generateArtistInfoPageChunkItem'),

    trackLink:
      (query.kind === 'track-cover'
        ? relation('linkTrack', contrib.thing.thing)
        : null),

    otherArtistLinks:
      relation('generateArtistInfoPageOtherArtistLinks', [contrib]),

    originDetails:
      relation('transformContent', contrib.thing.originDetails),
  }),

  data: (query, contrib) => ({
    kind:
      query.kind,

    annotation:
      contrib.annotation,

    label:
      contrib.thing.label,
  }),

  slots: {
    filterEditsForWiki: {
      type: 'boolean',
      default: false,
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    relations.template.slots({
      otherArtistLinks: relations.otherArtistLinks,

      annotation:
        language.encapsulate('artistPage.creditList.entry.artwork.accent', workingCapsule => {
          const workingOptions = {};

          const artworkLabel = data.label;

          if (artworkLabel) {
            workingCapsule += '.withLabel';
            workingOptions.label =
              language.typicallyLowerCase(artworkLabel);
          }

          const contribAnnotation =
            (slots.filterEditsForWiki
              ? data.annotation?.replace(/^edits for wiki(: )?/, '')
              : data.annotation);

          if (contribAnnotation) {
            workingCapsule += '.withAnnotation';
            workingOptions.annotation = contribAnnotation;
          }

          if (empty(Object.keys(workingOptions))) {
            return html.blank();
          }

          return language.$(workingCapsule, workingOptions);
        }),

      content:
        language.encapsulate('artistPage.creditList.entry', capsule =>
          (data.kind === 'track-cover'
            ? language.$(capsule, 'track', {
                track: relations.trackLink,
              })
            : html.tag('i',
                language.encapsulate(capsule, 'album', capsule =>
                  (data.kind === 'wallpaper'
                    ? language.$(capsule, 'wallpaperArt')
                 : data.kind === 'banner'
                    ? language.$(capsule, 'bannerArt')
                    : language.$(capsule, 'coverArt')))))),

      originDetails:
        relations.originDetails.slots({
          mode: 'inline',
          absorbPunctuationFollowingExternalLinks: false,
        }),
    }),
};
