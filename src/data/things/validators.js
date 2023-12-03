import {inspect as nodeInspect} from 'node:util';

// Heresy.
import printable_characters from 'printable-characters';
const {strlen} = printable_characters;

import {colors, ENABLE_COLOR} from '#cli';
import {cut, empty, typeAppearance, withAggregate} from '#sugar';
import {commentaryRegex} from '#wiki-data';

function inspect(value) {
  return nodeInspect(value, {colors: ENABLE_COLOR});
}

// Basic types (primitives)

export function a(noun) {
  return /[aeiou]/.test(noun[0]) ? `an ${noun}` : `a ${noun}`;
}

export function isType(value, type) {
  if (typeof value !== type)
    throw new TypeError(`Expected ${a(type)}, got ${typeAppearance(value)}`);

  return true;
}

export function isBoolean(value) {
  return isType(value, 'boolean');
}

export function isNumber(value) {
  return isType(value, 'number');
}

export function isPositive(number) {
  isNumber(number);

  if (number <= 0) throw new TypeError(`Expected positive number`);

  return true;
}

export function isNegative(number) {
  isNumber(number);

  if (number >= 0) throw new TypeError(`Expected negative number`);

  return true;
}

export function isPositiveOrZero(number) {
  isNumber(number);

  if (number < 0) throw new TypeError(`Expected positive number or zero`);

  return true;
}

export function isNegativeOrZero(number) {
  isNumber(number);

  if (number > 0) throw new TypeError(`Expected negative number or zero`);

  return true;
}

export function isInteger(number) {
  isNumber(number);

  if (number % 1 !== 0) throw new TypeError(`Expected integer`);

  return true;
}

export function isCountingNumber(number) {
  isInteger(number);
  isPositive(number);

  return true;
}

export function isWholeNumber(number) {
  isInteger(number);
  isPositiveOrZero(number);

  return true;
}

export function isString(value) {
  return isType(value, 'string');
}

export function isStringNonEmpty(value) {
  isString(value);

  if (value.trim().length === 0)
    throw new TypeError(`Expected non-empty string`);

  return true;
}

export function optional(validator) {
  return value =>
    value === null ||
    value === undefined ||
    validator(value);
}

// Complex types (non-primitives)

export function isInstance(value, constructor) {
  isObject(value);

  if (!(value instanceof constructor))
    throw new TypeError(`Expected ${constructor.name}, got ${value.constructor.name}`);

  return true;
}

export function isDate(value) {
  isInstance(value, Date);

  if (isNaN(value))
    throw new TypeError(`Expected valid date`);

  return true;
}

export function isObject(value) {
  isType(value, 'object');

  // Note: Please remember that null is always a valid value for properties
  // held by a CacheableObject. This assertion is exclusively for use in other
  // contexts.
  if (value === null) throw new TypeError(`Expected an object, got null`);

  return true;
}

export function isArray(value) {
  if (typeof value !== 'object' || value === null || !Array.isArray(value))
    throw new TypeError(`Expected an array, got ${typeAppearance(value)}`);

  return true;
}

// This one's shaped a bit different from other "is" functions.
// More like validate functions, it returns a function.
export function is(...values) {
  if (Array.isArray(values)) {
    values = new Set(values);
  }

  if (values.size === 1) {
    const expected = Array.from(values)[0];

    return (value) => {
      if (value !== expected) {
        throw new TypeError(`Expected ${expected}, got ${value}`);
      }

      return true;
    };
  }

  return (value) => {
    if (!values.has(value)) {
      throw new TypeError(`Expected one of ${Array.from(values).join(' ')}, got ${value}`);
    }

    return true;
  };
}

function validateArrayItemsHelper(itemValidator) {
  return (item, index, array) => {
    try {
      const value = itemValidator(item, index, array);

      if (value !== true) {
        throw new Error(`Expected validator to return true`);
      }
    } catch (error) {
      const annotation = `(index: ${colors.yellow(`${index}`)}, item: ${inspect(item)})`;

      error.message =
        (error.message.includes('\n') || strlen(annotation) > 20
          ? annotation + '\n' +
            error.message
              .split('\n')
              .map(line => `  ${line}`)
              .join('\n')
          : `${annotation} ${error}`);

      error[Symbol.for('hsmusic.decorate.indexInSourceArray')] = index;

      throw error;
    }
  };
}

export function validateArrayItems(itemValidator) {
  const helper = validateArrayItemsHelper(itemValidator);

  return (array) => {
    isArray(array);

    withAggregate({message: 'Errors validating array items'}, ({call}) => {
      for (let index = 0; index < array.length; index++) {
        call(helper, array[index], index, array);
      }
    });

    return true;
  };
}

export function strictArrayOf(itemValidator) {
  return validateArrayItems(itemValidator);
}

export function sparseArrayOf(itemValidator) {
  return validateArrayItems((item, index, array) => {
    if (item === false || item === null) {
      return true;
    }

    return itemValidator(item, index, array);
  });
}

export function validateInstanceOf(constructor) {
  return (object) => isInstance(object, constructor);
}

// Wiki data (primitives & non-primitives)

export function isColor(color) {
  isStringNonEmpty(color);

  if (color.startsWith('#')) {
    if (![4, 5, 7, 9].includes(color.length))
      throw new TypeError(`Expected #rgb, #rgba, #rrggbb, or #rrggbbaa, got length ${color.length}`);

    if (/[^0-9a-fA-F]/.test(color.slice(1)))
      throw new TypeError(`Expected hexadecimal digits`);

    return true;
  }

  throw new TypeError(`Unknown color format`);
}

export function isCommentary(commentaryText) {
  isString(commentaryText);

  const rawMatches =
    Array.from(commentaryText.matchAll(commentaryRegex));

  if (empty(rawMatches)) {
    throw new TypeError(`Expected at least one commentary heading`);
  }

  const niceMatches =
    rawMatches.map(match => ({
      position: match.index,
      length: match[0].length,
    }));

  validateArrayItems(({position, length}, index) => {
    if (index === 0 && position > 0) {
      throw new TypeError(`Expected first commentary heading to be at top`);
    }

    const ownInput = commentaryText.slice(position, position + length);
    const restOfInput = commentaryText.slice(position + length);
    const nextLineBreak = restOfInput.indexOf('\n');
    const upToNextLineBreak = restOfInput.slice(0, nextLineBreak);

    if (/\S/.test(upToNextLineBreak)) {
      throw new TypeError(
        `Expected commentary heading to occupy entire line, got extra text:\n` +
        `${colors.green(`"${cut(ownInput, 40)}"`)} (<- heading)\n` +
        `(extra on same line ->) ${colors.red(`"${cut(upToNextLineBreak, 30)}"`)}\n` +
        `(Check for missing "|-" in YAML, or a misshapen annotation)`);
    }

    const nextHeading =
      (index === niceMatches.length - 1
        ? commentaryText.length
        : niceMatches[index + 1].position);

    const upToNextHeading =
      commentaryText.slice(position + length, nextHeading);

    if (!/\S/.test(upToNextHeading)) {
      throw new TypeError(
        `Expected commentary entry to have body text, only got a heading`);
    }

    return true;
  })(niceMatches);

  return true;
}

const isArtistRef = validateReference('artist');

export function validateProperties(spec) {
  const specEntries = Object.entries(spec);
  const specKeys = Object.keys(spec);

  return (object) => {
    isObject(object);

    if (Array.isArray(object))
      throw new TypeError(`Expected an object, got array`);

    withAggregate({message: `Errors validating object properties`}, ({call}) => {
      for (const [specKey, specValidator] of specEntries) {
        call(() => {
          const value = object[specKey];
          try {
            specValidator(value);
          } catch (error) {
            error.message = `(key: ${colors.green(specKey)}, value: ${inspect(value)}) ${error.message}`;
            throw error;
          }
        });
      }

      const unknownKeys = Object.keys(object).filter((key) => !specKeys.includes(key));
      if (unknownKeys.length > 0) {
        call(() => {
          throw new Error(`Unknown keys present (${unknownKeys.length}): [${unknownKeys.join(', ')}]`);
        });
      }
    });

    return true;
  };
}

export const isContribution = validateProperties({
  who: isArtistRef,
  what: optional(isStringNonEmpty),
});

export const isContributionList = validateArrayItems(isContribution);

export const isAdditionalFile = validateProperties({
  title: isString,
  description: optional(isStringNonEmpty),
  files: validateArrayItems(isString),
});

export const isAdditionalFileList = validateArrayItems(isAdditionalFile);

export const isTrackSection = validateProperties({
  name: optional(isString),
  color: optional(isColor),
  dateOriginallyReleased: optional(isDate),
  isDefaultTrackSection: optional(isBoolean),
  tracks: optional(validateReferenceList('track')),
});

export const isTrackSectionList = validateArrayItems(isTrackSection);

export function isDimensions(dimensions) {
  isArray(dimensions);

  if (dimensions.length !== 2) throw new TypeError(`Expected 2 item array`);

  isPositive(dimensions[0]);
  isInteger(dimensions[0]);
  isPositive(dimensions[1]);
  isInteger(dimensions[1]);

  return true;
}

export function isDirectory(directory) {
  isStringNonEmpty(directory);

  if (directory.match(/[^a-zA-Z0-9_-]/))
    throw new TypeError(`Expected only letters, numbers, dash, and underscore, got "${directory}"`);

  return true;
}

export function isDuration(duration) {
  isNumber(duration);
  isPositiveOrZero(duration);

  return true;
}

export function isFileExtension(string) {
  isStringNonEmpty(string);

  if (string[0] === '.')
    throw new TypeError(`Expected no dot (.) at the start of file extension`);

  if (string.match(/[^a-zA-Z0-9_]/))
    throw new TypeError(`Expected only alphanumeric and underscore`);

  return true;
}

export function isLanguageCode(string) {
  // TODO: This is a stub function because really we don't need a detailed
  // is-language-code parser right now.

  isString(string);

  return true;
}

export function isName(name) {
  return isString(name);
}

export function isURL(string) {
  isStringNonEmpty(string);

  new URL(string);

  return true;
}

export function validateReference(type = 'track') {
  return (ref) => {
    isStringNonEmpty(ref);

    const match = ref
      .trim()
      .match(/^(?:(?<typePart>\S+):(?=\S))?(?<directoryPart>.+)(?<!:)$/);

    if (!match) throw new TypeError(`Malformed reference`);

    const {groups: {typePart, directoryPart}} = match;

    if (typePart) {
      if (typePart !== type)
        throw new TypeError(`Expected ref to begin with "${type}:", got "${typePart}:"`);

      isDirectory(directoryPart);
    }

    isName(ref);

    return true;
  };
}

export function validateReferenceList(type = '') {
  return validateArrayItems(validateReference(type));
}

const validateWikiData_cache = {};

export function validateWikiData({
  referenceType = '',
  allowMixedTypes = false,
}) {
  if (referenceType && allowMixedTypes) {
    throw new TypeError(`Don't specify both referenceType and allowMixedTypes`);
  }

  validateWikiData_cache[referenceType] ??= {};
  validateWikiData_cache[referenceType][allowMixedTypes] ??= new WeakMap();

  const isArrayOfObjects = validateArrayItems(isObject);

  return (array) => {
    const subcache = validateWikiData_cache[referenceType][allowMixedTypes];
    if (subcache.has(array)) return subcache.get(array);

    let OK = false;

    try {
      isArrayOfObjects(array);

      if (empty(array)) {
        OK = true; return true;
      }

      const allRefTypes = new Set();

      let foundThing = false;
      let foundOtherObject = false;

      for (const object of array) {
        const {[Symbol.for('Thing.referenceType')]: referenceType} = object.constructor;

        if (referenceType === undefined) {
          foundOtherObject = true;

          // Early-exit if a Thing has been found - nothing more can be learned.
          if (foundThing) {
            throw new TypeError(`Expected array of wiki data objects, got mixed items`);
          }
        } else {
          foundThing = true;

          // Early-exit if a non-Thing object has been found - nothing more can
          // be learned.
          if (foundOtherObject) {
            throw new TypeError(`Expected array of wiki data objects, got mixed items`);
          }

          allRefTypes.add(referenceType);
        }
      }

      if (foundOtherObject && !foundThing) {
        throw new TypeError(`Expected array of wiki data objects, got array of other objects`);
      }

      if (allRefTypes.size > 1) {
        if (allowMixedTypes) {
          OK = true; return true;
        }

        const types = () => Array.from(allRefTypes).join(', ');

        if (referenceType) {
          if (allRefTypes.has(referenceType)) {
            allRefTypes.remove(referenceType);
            throw new TypeError(`Expected array of only ${referenceType}, also got other types: ${types()}`)
          } else {
            throw new TypeError(`Expected array of only ${referenceType}, got other types: ${types()}`);
          }
        }

        throw new TypeError(`Expected array of unmixed reference types, got multiple: ${types()}`);
      }

      const onlyRefType = Array.from(allRefTypes)[0];

      if (referenceType && onlyRefType !== referenceType) {
        throw new TypeError(`Expected array of ${referenceType}, got array of ${onlyRefType}`)
      }

      OK = true; return true;
    } finally {
      subcache.set(array, OK);
    }
  };
}

export const isAdditionalName = validateProperties({
  name: isName,
  annotation: optional(isStringNonEmpty),

  // TODO: This only allows indicating sourcing from a track.
  // That's okay for the current limited use of "from", but
  // could be expanded later.
  from:
    // Double TODO: Explicitly allowing both references and
    // live objects to co-exist is definitely weird, and
    // altogether questions the way we define validators...
    optional(oneOf(
      validateReferenceList('track'),
      validateWikiData({referenceType: 'track'}))),
});

export const isAdditionalNameList = validateArrayItems(isAdditionalName);

// Compositional utilities

export function oneOf(...checks) {
  return (value) => {
    const errorMeta = [];

    for (let i = 0, check; (check = checks[i]); i++) {
      try {
        const result = check(value);

        if (result !== true) {
          throw new Error(`Check returned false`);
        }

        return true;
      } catch (error) {
        errorMeta.push([check, i, error]);
      }
    }

    // Don't process error messages until every check has failed.
    const errors = [];
    for (const [check, i, error] of errorMeta) {
      error.message = check.name
        ? `(#${i} "${check.name}") ${error.message}`
        : `(#${i}) ${error.message}`;
      error.check = check;
      errors.push(error);
    }
    throw new AggregateError(errors, `Expected one of ${checks.length} possible checks, but none were true`);
  };
}
