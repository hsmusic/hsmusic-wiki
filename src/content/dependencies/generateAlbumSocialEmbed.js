import {empty} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generateSocialEmbed',
    'generateAlbumSocialEmbedDescription',
  ],

  extraDependencies: ['absoluteTo', 'language', 'urls'],

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
      data.headingGroupName = firstGroup.directory;
      data.headingGroupDirectory = firstGroup.directory;
    }

    data.hasImage = album.hasCoverArt;

    if (data.hasImage) {
      data.coverArtDirectory = album.directory;
      data.coverArtFileExtension = album.coverArtFileExtension;
    }

    data.albumName = album.name;

    return data;
  },

  generate(data, relations, {absoluteTo, language, urls}) {
    return relations.socialEmbed.slots({
      title:
        language.$('albumPage.socialEmbed.title', {
          album: data.albumName,
        }),

      description: relations.description,

      headingContent:
        (data.hasHeading
          ? language.$('albumPage.socialEmbed.heading', {
              group: data.headingGroupName,
            })
          : null),

      headingLink:
        (data.hasHeading
          ? absoluteTo('localized.groupGallery', data.headingGroupDirectory)
          : null),

      imagePath:
        (data.hasImage
          ? '/' +
            urls
              .from('shared.root')
              .to('media.albumCover', data.coverArtDirectory, data.coverArtFileExtension)
          : null),
    });
  },
};
