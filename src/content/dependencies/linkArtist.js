export default {
  data(artist) {
    return {directory: artist.directory};
  },

  generate(data) {
    return `(stub artist link: "${data.directory}")`;
  },
};
