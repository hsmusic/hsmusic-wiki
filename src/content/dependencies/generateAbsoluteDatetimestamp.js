export default {
  data: (date, contextDate) => ({
    date,

    contextDate:
      contextDate ?? null,
  }),

  relations: (relation, _date, _contextDate) => ({
    template:
      relation('generateDatetimestampTemplate'),

    tooltip:
      relation('generateTooltip'),
  }),

  slots: {
    style: {
      validate: v => v.is(...[
        'full',
        'year',
        'minimal-difference',
        'year-difference',
      ]),
      default: 'full',
    },
  },

  generate(data, relations, slots, {html, language}) {
    if (!data.date) {
      return html.blank();
    }

    relations.template.setSlots({
      tooltip: relations.tooltip,
      datetime: data.date.toISOString(),
    });

    let label = null;
    let tooltip = null;

    switch (slots.style) {
      case 'full': {
        label = language.formatDate(data.date);
        break;
      }

      case 'year': {
        label = language.formatYear(data.date);
        tooltip = language.formatDate(data.date);
        break;
      }

      case 'minimal-difference': {
        if (data.date.toDateString() === data.contextDate?.toDateString()) {
          return html.blank();
        }

        if (data.date.getFullYear() === data.contextDate?.getFullYear()) {
          label = language.formatMonthDay(data.date);
          tooltip = language.formatDate(data.date);
        } else {
          label = language.formatYear(data.date);
          tooltip = language.formatDate(data.date);
        }

        break;
      }

      case 'year-difference': {
        if (data.date.toDateString() === data.contextDate?.toDateString()) {
          return html.blank();
        }

        if (data.date.getFullYear() === data.contextDate?.getFullYear()) {
          label = language.formatDate(data.date);
        } else {
          label = language.formatYear(data.date);
          tooltip = language.formatDate(data.date);
        }
      }
    }

    relations.template.setSlot('mainContent', label);
    relations.tooltip.setSlot('content', tooltip);

    return relations.template;
  },
};
