import {accumulateSum, empty} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generateAlbumSocialEmbedDescription',
  ],

  extraDependencies: [
    'absoluteTo',
    'language',
    'urls',
  ],

  relations(album) {
    const relations = {};

    relations.description = {
      dependency: 'generateAlbumSocialEmbedDescription',
      args: [album],
    };

    return relations;
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
    data.albumColor = album.color;

    return data;
  },

  generate(data, relations, {
    absoluteTo,
    language,
    urls,
  }) {
    const socialEmbed = {};

    if (data.hasHeading) {
      socialEmbed.heading =
        language.$('albumPage.socialEmbed.heading', {
          group: data.headingGroupName,
        });

      socialEmbed.headingLink =
        absoluteTo('localized.album', data.headingGroupDirectory);
    } else {
      socialEmbed.heading = '';
      socialEmbed.headingLink = null;
    }

    socialEmbed.title =
      language.$('albumPage.socialEmbed.title', {
        album: data.albumName,
      });

    socialEmbed.description = relations.description;

    if (data.hasImage) {
      const imagePath = urls
        .from('shared.root')
        .to('media.albumColor', data.coverArtDirectory, data.coverArtFileExtension);
      socialEmbed.image = '/' + imagePath;
    }

    socialEmbed.color = data.albumColor;

    return socialEmbed;
  },
};
