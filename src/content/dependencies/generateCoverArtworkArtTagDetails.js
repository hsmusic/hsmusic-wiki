import {compareArrays, empty, stitchArrays} from '#sugar';

function linkable(tag) {
  return !tag.isContentWarning;
}

export default {
  contentDependencies: ['linkArtTagGallery'],
  extraDependencies: ['html', 'language'],

  query: (artwork) => ({
    linkableArtTags:
      artwork.artTags.filter(linkable),

    mainArtworkLinkableArtTags:
      (artwork.mainArtwork
        ? artwork.mainArtwork.artTags.filter(linkable)
        : null),
  }),

  relations: (relation, query, _artwork) => ({
    artTagLinks:
      query.linkableArtTags
        .map(tag => relation('linkArtTagGallery', tag)),
  }),

  data: (query, artwork) => {
    if (
      !artwork.isMainArtwork &&
      query.mainArtworkLinkableArtTags &&
      !empty(query.mainArtworkLinkableArtTags) &&
      compareArrays(
        query.mainArtworkLinkableArtTags,
        query.linkableArtTags)
    ) {
      return {sameAsMainArtwork: true};
    }

    const seenShortNames = new Set();
    const duplicateShortNames = new Set();

    for (const {nameShort: shortName} of query.linkableArtTags) {
      if (seenShortNames.has(shortName)) {
        duplicateShortNames.add(shortName);
      } else {
        seenShortNames.add(shortName);
      }
    }

    const preferShortName =
      query.linkableArtTags
        .map(artTag => !duplicateShortNames.has(artTag.nameShort));

    return {preferShortName};
  },

  generate: (data, relations, {html, language}) =>
    language.encapsulate('misc.coverArtwork', capsule =>
      html.tag('ul', {class: 'image-details'},
        {[html.onlyIfContent]: true},

        {class: 'art-tag-details'},

        (data.sameAsMainArtwork
          ? language.$(capsule, 'sameTagsAsMainArtwork')
          : stitchArrays({
              artTagLink: relations.artTagLinks,
              preferShortName: data.preferShortName,
            }).map(({artTagLink, preferShortName}) =>
                html.tag('li',
                  artTagLink.slot('preferShortName', preferShortName)))))),
};
