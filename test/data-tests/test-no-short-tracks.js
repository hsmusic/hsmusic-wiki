export default function({
  albumData,
  getTotalDuration,
}) {
  const shortAlbums = albumData
    .filter(album => album.tracks.length > 1)
    .map(album => ({
      album,
      duration: getTotalDuration(album.tracks),
    }))
    .filter(album => album.duration)
    .filter(album => album.duration < 60 * 15);

  if (!shortAlbums.length) return true;

  shortAlbums.sort((a, b) => a.duration - b.duration);

  console.log(`Found ${shortAlbums.length} short albums! Oh nooooooo!`);
  console.log(`Here are the shortest 10:`);
  for (const {duration, album} of shortAlbums.slice(0, 10)) {
    console.log(`- (${duration}s)`, album);
  }

  return false;
}
