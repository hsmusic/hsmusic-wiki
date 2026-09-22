export default {
  relations: (relation, update) => ({
    link:
      relation('linkWikiUpdate', update),
  }),

  data: (update) => ({
    date:
      update.date,

    isMainUpdate:
      update.isMainUpdate,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('homepage.nav.update', capsule =>
      html.tag('span', {class: 'wiki-update'},
        data.isMainUpdate && {class: 'main-update'},

        language.encapsulate(capsule, workingCapsule => {
          const workingOptions = {update: relations.link};

          if (data.date) {
            workingCapsule += '.withDate';
            workingOptions.date = language.formatDate(data.date);
          }

          return language.$(workingCapsule, workingOptions);
        }))),
};
