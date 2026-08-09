export default {
  relations: (relation, entries, thing) => ({
    contentContentHeading:
      relation('generateContentContentHeading', thing),

    entries:
      entries
        .map(entry => relation('generateContentEntry', entry)),
  }),

  slots: {
    id: {type: 'string'},
    string: {type: 'string'},
  },

  generate: (relations, slots, {html}) =>
    html.tag('details',
      {[html.onlyIfContent]: true},

      slots.id && [
        {class: 'memorable'},
        {'data-memorable-id': slots.id},
      ],

      relations.contentContentHeading.slots({
        attributes: [
          slots.id && {id: slots.id},
        ],

        string: slots.string,
        summary: true,
      }),

      relations.entries),
};
