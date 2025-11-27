import {logWarn} from '#cli';
import {input, templateCompositeFrom} from '#composite';
import {empty} from '#sugar';
import {languageOptionRegex} from '#wiki-data';

import {withResultOfAvailabilityCheck} from '#composite/control-flow';

export default templateCompositeFrom({
  annotation: `withStrings`,

  inputs: {
    from: input({defaultDependency: '_strings'}),
  },

  outputs: ['#strings'],

  steps: () => [
    withResultOfAvailabilityCheck({
      from: input('from'),
    }).outputs({
      '#availability': '#stringsAvailability',
    }),

    withResultOfAvailabilityCheck({
      from: 'inheritedStrings',
    }).outputs({
      '#availability': '#inheritedStringsAvailability',
    }),

    {
      dependencies: [
        '#stringsAvailability',
        '#inheritedStringsAvailability',
      ],

      compute: (continuation, {
        ['#stringsAvailability']: stringsAvailability,
        ['#inheritedStringsAvailability']: inheritedStringsAvailability,
      }) =>
        (stringsAvailability || inheritedStringsAvailability
          ? continuation()
          : continuation.raiseOutput({'#strings': null})),
    },

    {
      dependencies: [input('from'), '#inheritedStringsAvailability'],
      compute: (continuation, {
        [input('from')]: strings,
        ['#inheritedStringsAvailability']: inheritedStringsAvailability,
      }) =>
        (inheritedStringsAvailability
          ? continuation()
          : continuation.raiseOutput({'#strings': strings})),
    },

    {
      dependencies: ['inheritedStrings', '#stringsAvailability'],
      compute: (continuation, {
        ['inheritedStrings']: inheritedStrings,
        ['#stringsAvailability']: stringsAvailability,
      }) =>
        (stringsAvailability
          ? continuation()
          : continuation.raiseOutput({'#strings': inheritedStrings})),
    },

    {
      dependencies: [input('from'), 'inheritedStrings', 'code'],
      compute(continuation, {
        [input('from')]: strings,
        ['inheritedStrings']: inheritedStrings,
        ['code']: code,
      }) {
        const validStrings = {
          ...inheritedStrings,
          ...strings,
        };

        const optionsFromTemplate = template =>
          Array.from(template.matchAll(languageOptionRegex))
            .map(({groups}) => groups.name);

        for (const [key, providedTemplate] of Object.entries(strings)) {
          const inheritedTemplate = inheritedStrings[key];
          if (!inheritedTemplate) continue;

          const providedOptions = optionsFromTemplate(providedTemplate);
          const inheritedOptions = optionsFromTemplate(inheritedTemplate);

          const missingOptionNames =
            inheritedOptions.filter(name => !providedOptions.includes(name));

          const misplacedOptionNames =
            providedOptions.filter(name => !inheritedOptions.includes(name));

          if (!empty(missingOptionNames) || !empty(misplacedOptionNames)) {
            logWarn`Not using ${code ?? '(no code)'} string ${key}:`;
            if (!empty(missingOptionNames))
              logWarn`- Missing options: ${missingOptionNames.join(', ')}`;
            if (!empty(misplacedOptionNames))
              logWarn`- Unexpected options: ${misplacedOptionNames.join(', ')}`;

            validStrings[key] = inheritedStrings[key];
          }
        }

        return continuation({'#strings': validStrings});
      },
    },
  ],
});
