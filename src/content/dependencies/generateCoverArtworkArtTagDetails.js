import {compareArrays, empty, stitchArrays} from '#sugar';

function linkable(tag) {
  return !tag.isContentWarning;
}

export default {
  query: (artwork) => ({
    linkableArtTags:
      artwork.artTags.filter(linkable),
  }),

  relations: (relation, query, _artwork) => ({
    artTagLinks:
      query.linkableArtTags
        .map(tag => relation('linkArtTagGallery', tag)),
  }),

  data: (query, artwork) => {
    const data = {};

    const compare = against =>
      !empty(query.linkableArtTags) &&
      against &&
      compareArrays(
        query.linkableArtTags,
        against.artTags.filter(linkable));

    data.sameAsMainArtwork =
      !artwork.isMainArtwork &&
      compare(artwork.mainArtwork);

    data.sameAsAttachedArtwork =
      compare(artwork.attachedArtwork);

    const seenShortNames = new Set();
    const duplicateShortNames = new Set();

    for (const {nameShort: shortName} of query.linkableArtTags) {
      if (seenShortNames.has(shortName)) {
        duplicateShortNames.add(shortName);
      } else {
        seenShortNames.add(shortName);
      }
    }

    data.preferShortName =
      query.linkableArtTags
        .map(artTag => !duplicateShortNames.has(artTag.nameShort));

    return data;
  },

  generate: (data, relations, {html, language}) =>
    language.encapsulate('misc.coverArtwork', capsule =>
      html.tag('ul', {class: 'image-details'},
        {[html.onlyIfContent]: true},

        {class: 'art-tag-details'},

        (data.sameAsAttachedArtwork
          ? html.blank()
       : data.sameAsMainArtwork && relations.artTagLinks.length >= 3
          ? language.$(capsule, 'sameTagsAsMainArtwork')
          : stitchArrays({
              artTagLink: relations.artTagLinks,
              preferShortName: data.preferShortName,
            }).map(({artTagLink, preferShortName}) =>
                html.tag('li',
                  artTagLink.slot('preferShortName', preferShortName)))))),
};
