export default {
  contentDependencies: [
    'generateSocialEmbed',
    'generateTrackSocialEmbedDescription',
  ],

  extraDependencies: ['absoluteTo', 'language', 'urls'],

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

    if (track.hasUniqueCoverArt) {
      data.imageSource = 'track';
      data.coverArtFileExtension = track.coverArtFileExtension;
    } else if (album.hasCoverArt) {
      data.imageSource = 'album';
      data.coverArtFileExtension = album.coverArtFileExtension;
    } else {
      data.imageSource = 'none';
    }

    return data;
  },

  generate: (data, relations, {absoluteTo, language, urls}) =>
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
          (data.imageSource === 'album'
            ? '/' +
              urls
                .from('shared.root')
                .to('media.albumCover', data.albumDirectory, data.coverArtFileExtension)
         : data.imageSource === 'track'
            ? '/' +
              urls
                .from('shared.root')
                .to('media.trackCover', data.albumDirectory, data.trackDirectory, data.coverArtFileExtension)
            : null),
      })),
};
