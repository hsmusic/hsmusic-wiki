export default {
  relations(relation, currentEntry, previousEntry, nextEntry) {
    const relations = {};

    if (previousEntry) {
      relations.previousEntryLink =
        relation('linkNewsEntry', previousEntry);

      if (previousEntry.date) {
        relations.previousEntryDatetimestamp =
          (currentEntry.date
            ? relation('generateRelativeDatetimestamp',
                previousEntry.date,
                currentEntry.date)
            : relation('generateAbsoluteDatetimestamp',
                previousEntry.date));
      }
    }

    if (nextEntry) {
      relations.nextEntryLink =
        relation('linkNewsEntry', nextEntry);

      if (nextEntry.date) {
        relations.nextEntryDatetimestamp =
          (currentEntry.date
            ? relation('generateRelativeDatetimestamp',
                nextEntry.date,
                currentEntry.date)
            : relation('generateAbsoluteDatetimestamp',
                nextEntry.date));
      }
    }

    return relations;
  },

  generate(relations, {html, language}) {
    const prefix = `newsEntryPage.readAnother`;

    const entryLines = [];

    if (relations.previousEntryLink) {
      const parts = [prefix, `previous`];
      const options = {};

      options.entry = relations.previousEntryLink;

      if (relations.previousEntryDatetimestamp) {
        parts.push('withDate');
        options.date =
          relations.previousEntryDatetimestamp.slot('style', 'full');
      }

      entryLines.push(language.$(...parts, options));
    }

    if (relations.nextEntryLink) {
      const parts = [prefix, `next`];
      const options = {};

      options.entry = relations.nextEntryLink;

      if (relations.nextEntryDatetimestamp) {
        parts.push('withDate');
        options.date =
          relations.nextEntryDatetimestamp.slot('style', 'full');
      }

      entryLines.push(language.$(...parts, options));
    }

    console.log(language.$order(prefix, 'previous.withDate', 0));

    return (
      html.tag('p', {class: 'read-another-links'},
        {[html.onlyIfContent]: true},
        {[html.joinChildren]: html.tag('br')},

        entryLines.length > 1 &&
        language.$order(prefix, 'previous.withDate', 0) === 'DATE' &&
        language.$order(prefix, 'next.withDate', 0) === 'DATE' &&
          {class: 'offset-tooltips'},

        entryLines));
  },
};
