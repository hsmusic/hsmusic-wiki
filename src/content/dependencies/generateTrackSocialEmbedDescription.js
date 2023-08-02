export default {
  generate() {
  },
};

/*
  const getSocialEmbedDescription = ({
    getArtistString: _getArtistString,
    language,
  }) => {
    const hasArtists = !empty(track.artistContribs);
    const hasCoverArtists = !empty(track.coverArtistContribs);
    const getArtistString = (contribs) =>
      _getArtistString(contribs, {
        // We don't want to put actual HTML tags in social embeds (sadly
        // they don't get parsed and displayed, generally speaking), so
        // override the link argument so that artist "links" just show
        // their names.
        link: {artist: (artist) => artist.name},
      });
    if (!hasArtists && !hasCoverArtists) return '';
    return language.formatString(
      'trackPage.socialEmbed.body' +
        [hasArtists && '.withArtists', hasCoverArtists && '.withCoverArtists']
          .filter(Boolean)
          .join(''),
      Object.fromEntries(
        [
          hasArtists && ['artists', getArtistString(track.artistContribs)],
          hasCoverArtists && [
            'coverArtists',
            getArtistString(track.coverArtistContribs),
          ],
        ].filter(Boolean)
      )
    );
  };
*/
