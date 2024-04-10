import {unique} from '#sugar';

export default {
  contentDependencies: ['linkArtist'],

  query(contribs) {
    const associatedContributionsByOtherArtists =
      contribs
        .flatMap(ownContrib =>
          ownContrib.associatedContributions
            .filter(associatedContrib =>
              associatedContrib.artist !== ownContrib.artist));

    const otherArtists =
      unique(
        associatedContributionsByOtherArtists
          .map(contrib => contrib.artist));

    return {otherArtists};
  },

  relations: (relation, query) => ({
    artistLinks:
      query.otherArtists
        .map(artist => relation('linkArtist', artist)),
  }),

  generate: (relations) =>
    relations.artistLinks,
};
