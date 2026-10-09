const PRETEND_RELEASE_WIKI = false;

function dummy(wikiUpdateData) {
  if (PRETEND_RELEASE_WIKI) {
    return wikiUpdateData.filter(update => !update.isStubUpdate);
  } else {
    return wikiUpdateData;
  }
}

export default {
  sprawl({wikiUpdateData}) {
    const sprawl = {};

    sprawl.latestMainUpdate =
      dummy(wikiUpdateData)
        .find(update => update.isMainUpdate);

    sprawl.latestRegularUpdate =
      sprawl.latestMainUpdate?.subsequentRegularUpdates.at(0)
      ?? null;

    return sprawl;
  },

  relations: (relation, sprawl) => ({
    latestMainUpdateRow:
      (sprawl.latestMainUpdate
        ? relation('generateWikiHomepageNavUpdateRow', sprawl.latestMainUpdate)
        : null),

    latestRegularUpdateRow:
      (sprawl.latestRegularUpdate
        ? relation('generateWikiHomepageNavUpdateRow', sprawl.latestRegularUpdate)
        : null),
  }),

  generate: (relations, {html}) =>
    html.tags([
      relations.latestMainUpdateRow,
      relations.latestRegularUpdateRow,
    ], {[html.joinChildren]: html.tag('br')}),
};
