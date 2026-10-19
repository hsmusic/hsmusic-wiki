export default {
  relations: (relation, spec) =>
    ({page: relation('listTracksWithExtra', spec, 'musicVideos', 'array')}),

  generate: (relations) =>
    relations.page.slots({
      // Would show the tracks' artists, rather than the music videos' artists,
      // which just... is not an acceptable kind of confusion. But the listing
      // as a whole needs to be built from scratch to properly present
      // music videos' artists.
      showArtists: false,

      // Likewise would show album dates and misconstrue music video dates, so.
      showAlbumDates: false,
    }),
};
