import striptags from 'striptags';

export default {
  sprawl: ({wikiInfo}) => ({wikiInfo}),

  data: (sprawl) => ({
    wikiName:
      sprawl.wikiInfo.nameShort,
  }),

  slots: {
    title: {
      type: 'html',
      mutable: false,
    },

    showWikiNameInTitle: {
      validate: v => v.is(true, false, 'auto'),
      default: 'auto',
    },

    subtitle: {
      type: 'html',
      mutable: false,
    },
  },

  generate: (data, slots, {html, language}) =>
    language.encapsulate('misc.pageTitle', workingCapsule => {
      const workingOptions = {};

      // Slightly jank: The output of striptags is, of course, a string,
      // and as far as language.formatString() is concerned, that means
      // it needs to be sanitized - including turning ampersands into
      // &amp;'s. But the title is already HTML that has implicitly been
      // sanitized, however it got here, and includes HTML entities that
      // are properly escaped. Those need to get included as they are,
      // so we wrap the title in a tag and pass it off as good to go.
      workingOptions.title =
        html.tags([
striptags(slots.title.toString()),
        ]);

      if (!html.isBlank(slots.subtitle)) {
        // Same shenanigans here, as far as wrapping striptags goes.
        workingCapsule += '.withSubtitle';
        workingOptions.subtitle =
          html.tags([
            striptags(slots.subtitle.toString()),
          ]);
      }

      const showWikiName =
        (slots.showWikiNameInTitle === true
? true
       : slots.showWikiNameInTitle === 'auto'
? html.isBlank(slots.subtitle)
: false);

      if (showWikiName) {
        workingCapsule += '.withWikiName';
        workingOptions.wikiName = data.wikiName;
      }

      return language.$(workingCapsule, workingOptions);
    }),
};