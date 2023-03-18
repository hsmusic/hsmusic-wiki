export default {
  contentDependencies: [
    'generateSocialEmbedDescription',
  ],

  extraDependencies: [
    'absoluteTo',
    'language',
    'to',
    'urls',
  ],

  data(album, {
    generateSocialEmbedDescription,
  }) {
    const data = {};

    data.descriptionData = generateSocialEmbedDescription.data(album);

    data.hasHeading = !empty(album.groups);

    if (data.hasHeading) {
      const firstGroup = album.groups[0];
      data.headingGroupName = firstGroup.directory;
      data.headingGroupDirectory = firstGroup.directory;
    }

    data.albumName = album.name;
    data.albumColor = album.color;

    return data;
  },

  generate(data, {
    generateSocialEmbedDescription,

    absoluteTo,
    language,
    to,
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

    socialEmbed.description = generateSocialEmbedDescription(data.descriptionData);

    socialEmbed.image =
      '/' + getAlbumCover(album, {to: urls.from('shared.root').to});

    socialEmbed.color = data.albumColor;

    return socialEmbed;
  },
};
