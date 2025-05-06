export default {
  contentDependencies: [
    'generateSocialEmbed',
    'generateTrackSocialEmbedDescription',
  ],

  extraDependencies: ['absoluteTo', 'language'],

  relations(relation, track) {
    return {
      socialEmbed:
        relation('generateSocialEmbed'),

      description:
        relation('generateTrackSocialEmbedDescription', track),
    };
  },

  data(track) {
    const {album} = track;
    const data = {};

    data.trackName = track.name;
    data.albumName = album.name;

    data.trackDirectory = track.directory;
    data.albumDirectory = album.directory;

    data.hasImage = track.hasUniqueCoverArt || album.hasCoverArt;

    if (track.hasUniqueCoverArt) {
      data.imagePath = track.trackArtworks[0].path;
    } else if (album.hasCoverArt) {
      data.imagePath = album.coverArtworks[0].path;
    }

    return data;
  },

  generate: (data, relations, {absoluteTo, language}) =>
    language.encapsulate('trackPage.socialEmbed', embedCapsule =>
      relations.socialEmbed.slots({
        title:
          language.$(embedCapsule, 'title', {
            track: data.trackName,
          }),

        description:
          relations.description,

        headingContent:
          language.$(embedCapsule, 'heading', {
            album: data.albumName,
          }),

        headingLink:
          absoluteTo('localized.album', data.albumDirectory),

        imagePath:
          (data.hasImage
            ? data.imagePath
            : null),
      })),
};
