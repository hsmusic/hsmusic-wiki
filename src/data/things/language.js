import { Temporal, toTemporalInstant } from '@js-temporal/polyfill';

import * as html from '#html';
import {empty, withAggregate} from '#sugar';
import {isLanguageCode} from '#validators';

import {
  getExternalLinkStringOfStyleFromDescriptors,
  getExternalLinkStringsFromDescriptors,
  isExternalLinkContext,
  isExternalLinkSpec,
  isExternalLinkStyle,
} from '#external-links';

import {
  externalFunction,
  flag,
  name,
} from '#composite/wiki-properties';

import CacheableObject from './cacheable-object.js';
import Thing from './thing.js';

export class Language extends Thing {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    // General language code. This is used to identify the language distinctly
    // from other languages (similar to how "Directory" operates in many data
    // objects).
    code: {
      flags: {update: true, expose: true},
      update: {validate: isLanguageCode},
    },

    // Human-readable name. This should be the language's own native name, not
    // localized to any other language.
    name: name(`Unnamed Language`),

    // Language code specific to JavaScript's Internationalization (Intl) API.
    // Usually this will be the same as the language's general code, but it
    // may be overridden to provide Intl constructors an alternative value.
    intlCode: {
      flags: {update: true, expose: true},
      update: {validate: isLanguageCode},
      expose: {
        dependencies: ['code'],
        transform: (intlCode, {code}) => intlCode ?? code,
      },
    },

    // Flag which represents whether or not to hide a language from general
    // access. If a language is hidden, its portion of the website will still
    // be built (with all strings localized to the language), but it won't be
    // included in controls for switching languages or the <link rel=alternate>
    // tags used for search engine optimization. This flag is intended for use
    // with languages that are currently in development and not ready for
    // formal release, or which are just kept hidden as "experimental zones"
    // for wiki development or content testing.
    hidden: flag(false),

    // Mapping of translation keys to values (strings). Generally, don't
    // access this object directly - use methods instead.
    strings: {
      flags: {update: true, expose: true},
      update: {validate: (t) => typeof t === 'object'},
      expose: {
        dependencies: ['inheritedStrings'],
        transform(strings, {inheritedStrings}) {
          if (strings || inheritedStrings) {
            return {...(inheritedStrings ?? {}), ...(strings ?? {})};
          } else {
            return null;
          }
        },
      },
    },

    // May be provided to specify "default" strings, generally (but not
    // necessarily) inherited from another Language object.
    inheritedStrings: {
      flags: {update: true, expose: true},
      update: {validate: (t) => typeof t === 'object'},
    },

    // List of descriptors for providing to external link utilities when using
    // language.formatExternalLink - refer to util/external-links.js for info.
    externalLinkSpec: {
      flags: {update: true, expose: true},
      update: {validate: isExternalLinkSpec},
    },

    // Update only

    escapeHTML: externalFunction(),

    // Expose only

    intl_date: this.#intlHelper(Intl.DateTimeFormat, {full: true}),
    intl_number: this.#intlHelper(Intl.NumberFormat),
    intl_listConjunction: this.#intlHelper(Intl.ListFormat, {type: 'conjunction'}),
    intl_listDisjunction: this.#intlHelper(Intl.ListFormat, {type: 'disjunction'}),
    intl_listUnit: this.#intlHelper(Intl.ListFormat, {type: 'unit'}),
    intl_pluralCardinal: this.#intlHelper(Intl.PluralRules, {type: 'cardinal'}),
    intl_pluralOrdinal: this.#intlHelper(Intl.PluralRules, {type: 'ordinal'}),

    validKeys: {
      flags: {expose: true},

      expose: {
        dependencies: ['strings', 'inheritedStrings'],
        compute: ({strings, inheritedStrings}) =>
          Array.from(
            new Set([
              ...Object.keys(inheritedStrings ?? {}),
              ...Object.keys(strings ?? {}),
            ])
          ),
      },
    },

    // TODO: This currently isn't used. Is it still needed?
    strings_htmlEscaped: {
      flags: {expose: true},
      expose: {
        dependencies: ['strings', 'inheritedStrings', 'escapeHTML'],
        compute({strings, inheritedStrings, escapeHTML}) {
          if (!(strings || inheritedStrings) || !escapeHTML) return null;
          const allStrings = {...inheritedStrings, ...strings};
          return Object.fromEntries(
            Object.entries(allStrings).map(([k, v]) => [k, escapeHTML(v)])
          );
        },
      },
    },
  });

  static #intlHelper (constructor, opts) {
    return {
      flags: {expose: true},
      expose: {
        dependencies: ['code', 'intlCode'],
        compute: ({code, intlCode}) => {
          const constructCode = intlCode ?? code;
          if (!constructCode) return null;
          return Reflect.construct(constructor, [constructCode, opts]);
        },
      },
    };
  }

  $(...args) {
    return this.formatString(...args);
  }

  assertIntlAvailable(property) {
    if (!this[property]) {
      throw new Error(`Intl API ${property} unavailable`);
    }
  }

  getUnitForm(value) {
    this.assertIntlAvailable('intl_pluralCardinal');
    return this.intl_pluralCardinal.select(value);
  }

  formatString(...args) {
    const hasOptions =
      typeof args.at(-1) === 'object' &&
      args.at(-1) !== null;

    const key =
      (hasOptions ? args.slice(0, -1) : args)
        .filter(Boolean)
        .join('.');

    const options =
      (hasOptions
        ? args.at(-1)
        : {});

    if (!this.strings) {
      throw new Error(`Strings unavailable`);
    }

    if (!this.validKeys.includes(key)) {
      throw new Error(`Invalid key ${key} accessed`);
    }

    // These will be filled up as we iterate over the template, slotting in
    // each option (if it's present).
    const missingOptionNames = new Set();
    const outputParts = [];

    // And this will have entries deleted as they're encountered in the
    // template. Leftover entries are misplaced.
    const optionsMap =
      new Map(
        Object.entries(options).map(([name, value]) => [
          name
            .replace(/[A-Z]/g, '_$&')
            .toUpperCase(),
          value,
        ]));

    const output = this.#iterateOverTemplate({
      template: this.strings[key],

      match: /{(?<name>[A-Z0-9_]+)}/g,

      insert: ({name: optionName}, canceledForming) => {
        if (optionsMap.has(optionName)) {
          let optionValue;

          // We'll only need the option's value if we're going to use it as
          // part of the formed output (see below).
          if (!canceledForming) {
            optionValue = optionsMap.get(optionName);
          }

          // But we always have to delete expected options off the provided
          // option map, since the leftovers are what will be used to tell
          // which are misplaced.
          optionsMap.delete(optionName);

          if (canceledForming) {
            return undefined;
          } else {
            return optionValue;
          }
        } else {
          // We don't need to continue forming the output if we've hit a
          // missing option name, since the end result of this formatString
          // call will be a thrown error, and formed output won't be needed.
          missingOptionNames.add(optionName);
          return undefined;
        }
      },
    });

    const misplacedOptionNames =
      Array.from(optionsMap.keys());

    withAggregate({message: `Errors in options for string "${key}"`}, ({push}) => {
      if (!empty(missingOptionNames)) {
        const names = Array.from(missingOptionNames).join(`, `);
        push(new Error(`Missing options: ${names}`));
      }

      if (!empty(misplacedOptionNames)) {
        const names = Array.from(misplacedOptionNames).join(`, `);
        push(new Error(`Unexpected options: ${names}`));
      }
    });

    return output;
  }

  #iterateOverTemplate({
    template,
    match: regexp,
    insert: insertFn,
  }) {
    const outputParts = [];

    let canceledForming = false;

    let lastIndex = 0;
    let partInProgress = '';

    for (const match of template.matchAll(regexp)) {
      const insertion =
        insertFn(match.groups, canceledForming);

      if (insertion === undefined) {
        canceledForming = true;
      }

      // Don't proceed with forming logic if the insertion function has
      // indicated that's not needed anymore - but continue iterating over
      // the rest of the template's matches, so other iteration logic (with
      // side effects) gets to process everything.
      if (canceledForming) {
        continue;
      }

      partInProgress += template.slice(lastIndex, match.index);

      // Sanitize string arguments in particular. These are taken to come from
      // (raw) data and may include special characters that aren't meant to be
      // rendered as HTML markup.
      const sanitizedInsertion =
        this.#sanitizeValueForInsertion(insertion);

      if (typeof sanitizedInsertion === 'string') {
        // Join consecutive strings together.
        partInProgress += sanitizedInsertion;
      } else if (
        sanitizedInsertion instanceof html.Tag &&
        sanitizedInsertion.contentOnly
      ) {
        // Collapse string-only tag contents onto the current string part.
        partInProgress += sanitizedInsertion.toString();
      } else {
        // Push the string part in progress, then the insertion as-is.
        outputParts.push(partInProgress);
        outputParts.push(sanitizedInsertion);
        partInProgress = '';
      }

      lastIndex = match.index + match[0].length;
    }

    if (canceledForming) {
      return undefined;
    }

    // Tack onto the final partInProgress, which may still have a value by this
    // point, if the final inserted value was a string. (Otherwise, it'll just
    // be equal to the remaining template text.)
    if (lastIndex < template.length) {
      partInProgress += template.slice(lastIndex);
    }

    if (partInProgress) {
      outputParts.push(partInProgress);
    }

    return this.#wrapSanitized(outputParts);
  }

  // Processes a value so that it's suitable to be inserted into a template.
  // For strings, this escapes HTML special characters, displaying them as-are
  // instead of representing HTML markup. For numbers and booleans, this turns
  // them into string values, so they never accidentally get caught as falsy
  // by #html stringification. Everything else - most importantly including
  // html.Tag objects - gets left as-is, preserving the value exactly as it's
  // provided.
  #sanitizeValueForInsertion(value) {
    const escapeHTML = CacheableObject.getUpdateValue(this, 'escapeHTML');
    if (!escapeHTML) {
      throw new Error(`escapeHTML unavailable`);
    }

    switch (typeof value) {
      case 'string':
        return escapeHTML(value);

      case 'number':
      case 'boolean':
        return value.toString();

      default:
        return value;
    }
  }

  // Wraps the output of a formatting function in a no-name-nor-attributes
  // HTML tag, which will indicate to other calls to formatString that this
  // content is a string *that may contain HTML* and doesn't need to
  // sanitized any further. It'll still .toString() to just the string
  // contents, if needed.
  #wrapSanitized(content) {
    return html.tags(content, {
      [html.joinChildren]: '',
      [html.noEdgeWhitespace]: true,
    });
  }

  // Similar to the above internal methods, but this one is public.
  // It should be used when embedding content that may not have previously
  // been sanitized directly into an HTML tag or template's contents.
  // The templating engine usually handles this on its own, as does passing
  // a value (sanitized or not) directly for inserting into formatting
  // functions, but if you used a custom slot validation function (for example,
  // {validate: v => v.isHTML} instead of {type: 'string'} / {type: 'html'})
  // and are embedding the contents of the slot as a direct child of another
  // tag, you should manually sanitize those contents with this function.
  sanitize(value) {
    if (typeof value === 'string') {
      return this.#wrapSanitized(this.#sanitizeValueForInsertion(value));
    } else {
      return value;
    }
  }

  formatDate(date) {
    this.assertIntlAvailable('intl_date');
    return this.intl_date.format(date);
  }

  formatDateRange(startDate, endDate) {
    this.assertIntlAvailable('intl_date');
    return this.intl_date.formatRange(startDate, endDate);
  }

  formatDateDuration({
    years: numYears = 0,
    months: numMonths = 0,
    days: numDays = 0,
    approximate = false,
  }) {
    let basis;

    const years = this.countYears(numYears, {unit: true});
    const months = this.countMonths(numMonths, {unit: true});
    const days = this.countDays(numDays, {unit: true});

    if (numYears && numMonths && numDays)
      basis = this.formatString('count.dateDuration.yearsMonthsDays', {years, months, days});
    else if (numYears && numMonths)
      basis = this.formatString('count.dateDuration.yearsMonths', {years, months});
    else if (numYears && numDays)
      basis = this.formatString('count.dateDuration.yearsDays', {years, days});
    else if (numYears)
      basis = this.formatString('count.dateDuration.years', {years});
    else if (numMonths && numDays)
      basis = this.formatString('count.dateDuration.monthsDays', {months, days});
    else if (numMonths)
      basis = this.formatString('count.dateDuration.months', {months});
    else if (numDays)
      basis = this.formatString('count.dateDuration.days', {days});
    else
      return this.formatString('count.dateDuration.zero');

    if (approximate) {
      return this.formatString('count.dateDuration.approximate', {
        duration: basis,
      });
    } else {
      return basis;
    }
  }

  formatRelativeDate(currentDate, referenceDate, {
    considerRoundingDays = false,
    approximate = true,
    absolute = true,
  } = {}) {
    const currentInstant = toTemporalInstant.apply(currentDate);
    const referenceInstant = toTemporalInstant.apply(referenceDate);

    const comparison =
      Temporal.Instant.compare(currentInstant, referenceInstant);

    if (comparison === 0) {
      return this.formatString('count.dateDuration.same');
    }

    const currentTDZ = currentInstant.toZonedDateTimeISO('Etc/UTC');
    const referenceTDZ = referenceInstant.toZonedDateTimeISO('Etc/UTC');

    const earlierTDZ = (comparison === -1 ? currentTDZ : referenceTDZ);
    const laterTDZ = (comparison === 1 ? currentTDZ : referenceTDZ);

    const {years, months, days} =
      laterTDZ.since(earlierTDZ, {
        largestUnit: 'year',
        smallestUnit:
          (considerRoundingDays
            ? (laterTDZ.since(earlierTDZ, {
                largestUnit: 'year',
                smallestUnit: 'day',
              }).years
                ? 'month'
                : 'day')
            : 'day'),
        roundingMode: 'halfCeil',
      });

    const duration =
      this.formatDateDuration({
        years, months, days,
        approximate: false,
      });

    const relative =
      this.formatString(
        'count.dateDuration',
        (approximate && (years || months || days)
          ? (comparison === -1
              ? 'approximateEarlier'
              : 'approximateLater')
          : (comparison === -1
              ? 'earlier'
              : 'later')),
        {duration});

    if (absolute) {
      return this.formatString('count.dateDuration.relativeAbsolute', {
        relative,
        absolute: this.formatDate(currentDate),
      });
    } else {
      return relative;
    }
  }

  formatDuration(secTotal, {approximate = false, unit = false} = {}) {
    if (secTotal === 0) {
      return this.formatString('count.duration.missing');
    }

    const hour = Math.floor(secTotal / 3600);
    const min = Math.floor((secTotal - hour * 3600) / 60);
    const sec = Math.floor(secTotal - hour * 3600 - min * 60);

    const pad = (val) => val.toString().padStart(2, '0');

    const stringSubkey = unit ? '.withUnit' : '';

    const duration =
      hour > 0
        ? this.formatString('count.duration.hours' + stringSubkey, {
            hours: hour,
            minutes: pad(min),
            seconds: pad(sec),
          })
        : this.formatString('count.duration.minutes' + stringSubkey, {
            minutes: min,
            seconds: pad(sec),
          });

    return approximate
      ? this.formatString('count.duration.approximate', {duration})
      : duration;
  }

  formatExternalLink(url, {
    style = 'normal',
    context = 'generic',
  } = {}) {
    if (!this.externalLinkSpec) {
      throw new TypeError(`externalLinkSpec unavailable`);
    }

    isExternalLinkContext(context);

    if (style === 'all') {
      return getExternalLinkStringsFromDescriptors(url, this.externalLinkSpec, {
        language: this,
        context,
      });
    }

    isExternalLinkStyle(style);

    return getExternalLinkStringOfStyleFromDescriptors(url, style, this.externalLinkSpec, {
      language: this,
      context,
    });
  }

  formatIndex(value) {
    this.assertIntlAvailable('intl_pluralOrdinal');
    return this.formatString('count.index.' + this.intl_pluralOrdinal.select(value), {index: value});
  }

  formatNumber(value) {
    this.assertIntlAvailable('intl_number');
    return this.intl_number.format(value);
  }

  formatWordCount(value) {
    const num = this.formatNumber(
      value > 1000 ? Math.floor(value / 100) / 10 : value
    );

    const words =
      value > 1000
        ? this.formatString('count.words.thousand', {words: num})
        : this.formatString('count.words', {words: num});

    return this.formatString('count.words.withUnit.' + this.getUnitForm(value), {words});
  }

  #formatListHelper(array, processFn) {
    // Operate on "insertion markers" instead of the actual contents of the
    // array, because the process function (likely an Intl operation) is taken
    // to only operate on strings. We'll insert the contents of the array back
    // at these points afterwards.

    const insertionMarkers =
      Array.from(
        {length: array.length},
        (_item, index) => `<::insertion_${index}>`);

    // Basically the same insertion logic as in formatString. Like there, we
    // can't assume that insertion markers were kept in the same order as they
    // were provided, so we'll refer to the marked index. But we don't need to
    // worry about some of the indices *not* corresponding to a provided source
    // item, like we do in formatString, so that cuts out a lot of the
    // validation logic.

    return this.#iterateOverTemplate({
      template: processFn(insertionMarkers),

      match: /<::insertion_(?<index>[0-9]+)>/g,

      insert: ({index: markerIndex}) => {
        return array[markerIndex];
      },
    });
  }

  // Conjunction list: A, B, and C
  formatConjunctionList(array) {
    this.assertIntlAvailable('intl_listConjunction');
    return this.#formatListHelper(
      array,
      array => this.intl_listConjunction.format(array));
  }

  // Disjunction lists: A, B, or C
  formatDisjunctionList(array) {
    this.assertIntlAvailable('intl_listDisjunction');
    return this.#formatListHelper(
      array,
      array => this.intl_listDisjunction.format(array));
  }

  // Unit lists: A, B, C
  formatUnitList(array) {
    this.assertIntlAvailable('intl_listUnit');
    return this.#formatListHelper(
      array,
      array => this.intl_listUnit.format(array));
  }

  // Lists without separator: A B C
  formatListWithoutSeparator(array) {
    return this.#formatListHelper(
      array,
      array => array.join(' '));
  }

  // File sizes: 42.5 kB, 127.2 MB, 4.13 GB, 998.82 TB
  formatFileSize(bytes) {
    if (!bytes) return '';

    bytes = parseInt(bytes);
    if (isNaN(bytes)) return '';

    const round = (exp) => Math.round(bytes / 10 ** (exp - 1)) / 10;

    if (bytes >= 10 ** 12) {
      return this.formatString('count.fileSize.terabytes', {
        terabytes: round(12),
      });
    } else if (bytes >= 10 ** 9) {
      return this.formatString('count.fileSize.gigabytes', {
        gigabytes: round(9),
      });
    } else if (bytes >= 10 ** 6) {
      return this.formatString('count.fileSize.megabytes', {
        megabytes: round(6),
      });
    } else if (bytes >= 10 ** 3) {
      return this.formatString('count.fileSize.kilobytes', {
        kilobytes: round(3),
      });
    } else {
      return this.formatString('count.fileSize.bytes', {bytes});
    }
  }
}

const countHelper = (stringKey, optionName = stringKey) =>
  function(value, {unit = false} = {}) {
    return this.formatString(
      unit
        ? `count.${stringKey}.withUnit.` + this.getUnitForm(value)
        : `count.${stringKey}`,
      {[optionName]: this.formatNumber(value)});
  };

// TODO: These are hard-coded. Is there a better way?
Object.assign(Language.prototype, {
  countAdditionalFiles: countHelper('additionalFiles', 'files'),
  countAlbums: countHelper('albums'),
  countArtTags: countHelper('artTags', 'tags'),
  countArtworks: countHelper('artworks'),
  countCommentaryEntries: countHelper('commentaryEntries', 'entries'),
  countContributions: countHelper('contributions'),
  countCoverArts: countHelper('coverArts'),
  countDays: countHelper('days'),
  countFlashes: countHelper('flashes'),
  countMonths: countHelper('months'),
  countTimesReferenced: countHelper('timesReferenced'),
  countTimesUsed: countHelper('timesUsed'),
  countTracks: countHelper('tracks'),
  countWeeks: countHelper('weeks'),
  countYears: countHelper('years'),
});
