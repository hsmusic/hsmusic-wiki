export default {
  hook(contract, [album, group]) {
    contract.provide({
      group,
      album,
      albums: contract.selectProperty(group, 'albums'),
    });
  },

  compute({group, album, albums}) {
    const datedAlbums = albums.filter(album => album.date);
    const index = datedAlbums.indexOf(album);
    const previousAlbum = (index > 0) && datedAlbums[index - 1];
    const nextAlbum = (index < datedAlbums.length - 1) && datedAlbums[index + 1];
    return {previousAlbum, nextAlbum};
  },
};
