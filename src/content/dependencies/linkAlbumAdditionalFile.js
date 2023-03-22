export default {
  data(album, file) {
    return {
      albumDirectory: album.directory,
      file,
    };
  },

  generate(data) {
    return `(stub album additional file link: ${data.albumDirectory}/${data.file})`;
  },
};
