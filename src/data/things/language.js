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
  simpleString,
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
    name: simpleString(),

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
        : null);

    if (!this.strings) {
      throw new Error(`Strings unavailable`);
    }

    if (!this.validKeys.includes(key)) {
      throw new Error(`Invalid key ${key} accessed`);
    }

    const template = this.strings[key];

    const providedOptionNames =
      (hasOptions
        ? Object.keys(options)
            .map(name => name.replace(/[A-Z]/g, '_$&'))
            .map(name => name.toUpperCase())
        : []);

    const expectedOptionNames =
      Array.from(template.matchAll(/{(?<name>[A-Z0-9_]+)}/g))
        .map(({groups}) => groups.name);

    const missingOptionNames =
      expectedOptionNames.filter(name => !providedOptionNames.includes(name));

    const misplacedOptionNames =
      providedOptionNames.filter(name => !expectedOptionNames.includes(name));

    withAggregate({message: `Errors in options for string "${key}"`}, ({push}) => {
      if (!empty(missingOptionNames)) {
        const names = missingOptionNames.join(`, `);
        push(new Error(`Missing options: ${names}`));
      }

      if (!empty(misplacedOptionNames)) {
        const names = misplacedOptionNames.join(`, `);
        push(new Error(`Unexpected options: ${names}`));
      }
    });

    let output;

    if (hasOptions) {
      // Convert the keys on the options dict from camelCase to CONSTANT_CASE.
      // (This isn't an OUTRAGEOUSLY versatile algorithm for doing that, 8ut
      // like, who cares, dude?) Also, this is an array, 8ecause it's handy
      // for the iterating we're a8out to do. Also strip HTML from options
      // that are literal strings - real HTML content should always be proper
      // HTML objects (see html.js).
      const processedOptions =
        Object.entries(options).map(([k, v]) => [
          k.replace(/[A-Z]/g, '_$&').toUpperCase(),
          this.#sanitizeStringArg(v),
        ]);

      // Replacement time! Woot. Reduce comes in handy here!
      output =
        processedOptions.reduce(
          (x, [k, v]) => x.replaceAll(`{${k}}`, v),
          template);
    } else {
      // Without any options provided, just use the template as-is. This will
      // have errored if the template expected options, and otherwise will be
      // the right value.
      output = template;
    }

    // Last caveat: Wrap the output in an HTML tag so that it doesn't get
    // treated as unsanitized HTML if *it* gets passed as an argument to
    // *another* formatString call.
    return this.#wrapSanitized(output);
  }

  // Escapes HTML special characters so they're displayed as-are instead of
  // treated by the browser as a tag. This does *not* have an effect on actual
  // html.Tag objects, which are treated as sanitized by default (so that they
  // can be nested inside strings at all).
  #sanitizeStringArg(arg, {preserveType = false} = {}) {
    const escapeHTML = CacheableObject.getUpdateValue(this, 'escapeHTML');

    if (!escapeHTML) {
      throw new Error(`escapeHTML unavailable`);
    }

    if (typeof arg !== 'string') {
      // TODO: Preserving type will be the only behavior.
      if (preserveType) {
        return arg;
      } else {
        return arg.toString();
      }
    }

    return escapeHTML(arg);
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
  // a value (sanitized or not) directly as an argument to formatString,
  // but if you used a custom validation function ({validate: v => v.isHTML}
  // instead of {type: 'string'} / {type: 'html'}) and are embedding the
  // contents of a slot directly, it should be manually sanitized with this
  // function first.
  sanitize(arg) {
    const escapeHTML = CacheableObject.getUpdateValue(this, 'escapeHTML');

    if (!escapeHTML) {
      throw new Error(`escapeHTML unavailable`);
    }

    return (
      (typeof arg === 'string'
        ? this.#wrapSanitized(escapeHTML(arg))
        : arg));
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

  // Conjunction list: A, B, and C
  formatConjunctionList(array) {
    this.assertIntlAvailable('intl_listConjunction');
    return this.#wrapSanitized(
      this.intl_listConjunction.format(
        array.map(item => this.#sanitizeStringArg(item))));
  }

  // Disjunction lists: A, B, or C
  formatDisjunctionList(array) {
    this.assertIntlAvailable('intl_listDisjunction');
    return this.#wrapSanitized(
      this.intl_listDisjunction.format(
        array.map(item => this.#sanitizeStringArg(item))));
  }

  // Unit lists: A, B, C
  formatUnitList(array) {
    this.assertIntlAvailable('intl_listUnit');
    return this.#wrapSanitized(
      this.intl_listUnit.format(
        array.map(item => this.#sanitizeStringArg(item))));
  }

  // Lists without separator: A B C
  formatListWithoutSeparator(array) {
    return this.#wrapSanitized(
      array.map(item => this.#sanitizeStringArg(item))
        .join(' '));
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

const countHelper = (stringKey, argName = stringKey) =>
  function(value, {unit = false} = {}) {
    return this.formatString(
      unit
        ? `count.${stringKey}.withUnit.` + this.getUnitForm(value)
        : `count.${stringKey}`,
      {[argName]: this.formatNumber(value)});
  };

// TODO: These are hard-coded. Is there a better way?
Object.assign(Language.prototype, {
  countAdditionalFiles: countHelper('additionalFiles', 'files'),
  countAlbums: countHelper('albums'),
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
