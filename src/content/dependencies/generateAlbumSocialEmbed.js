import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateSocialEmbed',
    'generateAlbumSocialEmbedDescription',
  ],

  extraDependencies: ['absoluteTo', 'language'],

  relations(relation, album) {
    return {
      socialEmbed:
        relation('generateSocialEmbed'),

      description:
        relation('generateAlbumSocialEmbedDescription', album),
    };
  },

  data(album) {
    const data = {};

    data.hasHeading = !empty(album.groups);

    if (data.hasHeading) {
      const firstGroup = album.groups[0];
      data.headingGroupName = firstGroup.name;
      data.headingGroupDirectory = firstGroup.directory;
    }

    data.hasImage = album.hasCoverArt;

    if (data.hasImage) {
      data.imagePath = album.coverArtworks[0].path;
    }

    data.albumName = album.name;

    return data;
  },

  generate: (data, relations, {absoluteTo, language}) =>
    language.encapsulate('albumPage.socialEmbed', embedCapsule =>
      relations.socialEmbed.slots({
        title:
          language.$(embedCapsule, 'title', {
            album: data.albumName,
          }),

        description: relations.description,

        headingContent:
          (data.hasHeading
            ? language.$(embedCapsule, 'heading', {
                group: data.headingGroupName,
              })
            : null),

        headingLink:
          (data.hasHeading
            ? absoluteTo('localized.groupGallery', data.headingGroupDirectory)
            : null),

        imagePath:
          (data.hasImage
            ? data.imagePath
            : null),
      })),
};
