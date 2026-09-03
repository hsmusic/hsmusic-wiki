export default {
  relations: (relation, detail) => ({
    template:
      relation('generateSoundDetailRowTemplate', detail),

    detail:
      relation('transformContent', detail.detail),
  }),

  data: (detail) => ({
    name:
      detail.name,

    bank:
      detail.bank,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('misc.soundDetails.row.soundfont', capsule =>
      relations.template.slots({
        content:
          language.encapsulate(capsule, workingCapsule => {
            const workingOptions = {};

            workingOptions.kind =
              html.tag('span', {class: 'kind'},
                language.$(capsule, 'kind'));

            workingOptions.name = data.name;

            relations.detail.setSlot('mode', 'inline');
            if (!html.isBlank(relations.detail)) {
              workingCapsule += '.withDetail';
              workingOptions.detail = relations.detail;
            }

            return language.$(workingCapsule, workingOptions);
          }),
      })),
}
