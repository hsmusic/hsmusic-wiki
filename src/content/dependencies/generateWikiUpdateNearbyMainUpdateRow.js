export default {
  relations: (relation, nearbyUpdate, currentUpdate) => ({
    link:
      relation('linkWikiUpdate', nearbyUpdate),

    datetimestamp:
      (currentUpdate.isStubUpdate || nearbyUpdate.isStubUpdate
        ? null
        : relation('generateRelativeDatetimestamp',
            nearbyUpdate.date,
            currentUpdate.date)),
  }),

  data: (nearbyUpdate, _currentUpdate) => ({
    date:
      nearbyUpdate.date,
  }),

  slots: {
    string: {validate: v => v.is('previous', 'next')},
  },

  generate: (data, relations, slots, {html, language}) =>
    html.tag('li',
      language.encapsulate('wikiUpdatePage.info.nearbyUpdates', capsule =>
        language.encapsulate(capsule, slots.string, workingCapsule => {
          const workingOptions = {update: relations.link};

          if (relations.datetimestamp) {
            workingCapsule += '.withDate';
            workingOptions.date = relations.datetimestamp;
          } else if (data.date) {
            workingCapsule += '.withDate';
            workingOptions.date = language.formatDate(data.date);
          }

          return language.$(workingCapsule, workingOptions);
        }))),
};
