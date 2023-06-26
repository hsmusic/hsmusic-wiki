import {empty} from '../../util/sugar.js';

export default {
  contentDependencies: ['linkArtist'],

  relations(relation, contribs, artist) {
    const otherArtistContribs = contribs.filter(({who}) => who !== artist);

    if (empty(otherArtistContribs)) {
      return {};
    }

    const otherArtistLinks =
      otherArtistContribs
        .map(({who}) => relation('linkArtist', who));

    return {otherArtistLinks};
  },

  generate(relations) {
    return relations.otherArtistLinks ?? null;
  },
};
