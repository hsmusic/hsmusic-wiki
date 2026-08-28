import {empty} from '#sugar';

export default {
  query: (contrib) => ({
    artwork:
      contrib.thing,

    kind:
      (contrib.thing.thingProperty === 'bannerArtwork'
        ? 'banner'
     : contrib.thing.thingProperty === 'wallpaperArtwork'
        ? 'wallpaper'
     : contrib.thing.thingProperty === 'coverArtworks'
        ? 'album-cover'
        : 'track-cover'),
  }),

  relations: (relation, query, contrib) => ({
    template:
      relation('generateArtistInfoPageChunkItem'),

    trackLink:
      (query.kind === 'track-cover'
        ? relation('linkTrack', query.artwork.thing)
        : null),

    originDetails:
      relation('transformContent', query.artwork.originDetails),

    mainArtworkLink:
      (query.artwork.mainArtwork
        ? relation('linkOtherArtworkOnArtistInfoPage',
            query.artwork.mainArtwork, contrib.artist)
        : null),
  }),

  data: (query, contrib) => ({
    kind:
      query.kind,

    annotation:
      contrib.annotation,

    label:
      query.artwork.label,

    showAsReusedFromAlbum:
      query.artwork.isReusedArtwork &&
      query.artwork.thing.isTrack &&
      query.artwork.thing.otherReleases
        .includes(query.artwork.mainArtwork.thing),
  }),

  slots: {
    filterEditsForWiki: {
      type: 'boolean',
      default: false,
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('artistPage.creditList.entry', capsule =>
      relations.template.slots({
        annotation:
          language.encapsulate(capsule, 'artwork.accent', workingCapsule => {
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
                    : language.$(capsule, 'coverArt'))))),

        originDetails:
          html.tags([
            relations.originDetails.slots({
              mode: 'inline',
              absorbPunctuationFollowingExternalLinks: false,
            }),

            relations.mainArtworkLink &&
              html.tag('span',
                language.$(capsule, 'artwork.reusedFrom', {
                  where:
                    relations.mainArtworkLink
                      .slot('showAlbumName', data.showAsReusedFromAlbum),
                })),
          ], {[html.joinChildren]: html.tag('br')}),
      })),
};
