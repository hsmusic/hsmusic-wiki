import {empty} from '#sugar';

export default {
  contentDependencies: ['linkArtist'],

  relations(relation, contribs, artist) {
    const otherArtistContribs =
      contribs.filter(contrib => contrib.artist !== artist);

    if (empty(otherArtistContribs)) {
      return {};
    }

    const otherArtistLinks =
      otherArtistContribs
        .map(contrib => relation('linkArtist', contrib.artist));

    return {otherArtistLinks};
  },

  generate(relations) {
    return relations.otherArtistLinks ?? null;
  },
};
