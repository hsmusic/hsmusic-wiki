export default {
  relations: (relation, section) => ({
    contentHeading:
      relation('generateContentHeading'),

    changes:
      relation('transformContent', section.changes),
  }),

  data: (section) => ({
    name:
      section.name,

    hash:
      section.hash,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('wikiUpdatePage', pageCapsule =>
      html.tags([
        relations.contentHeading.slots({
          tag: 'h2',

          attributes: [
            data.hash &&
              {id: data.hash},
          ],

          title:
            language.$(pageCapsule, 'section', {
              section: data.name,
            }),
        }),

        relations.changes.slots({
          mode: 'multiline',
        }),
      ])),
};
