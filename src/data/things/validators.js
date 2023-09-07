import {inspect as nodeInspect} from 'node:util';

import {colors, ENABLE_COLOR} from '#cli';
import {withAggregate} from '#sugar';

function inspect(value) {
  return nodeInspect(value, {colors: ENABLE_COLOR});
}

// Basic types (primitives)

function a(noun) {
  return /[aeiou]/.test(noun[0]) ? `an ${noun}` : `a ${noun}`;
}

function isType(value, type) {
  if (typeof value !== type)
    throw new TypeError(`Expected ${a(type)}, got ${typeof value}`);

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
  return value => value === null || value === undefined || validator(value);
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
    throw new TypeError(`Expected an array, got ${value}`);

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
  return (item, index) => {
    try {
      const value = itemValidator(item);

      if (value !== true) {
        throw new Error(`Expected validator to return true`);
      }
    } catch (error) {
      error.message = `(index: ${colors.yellow(`#${index}`)}, item: ${inspect(item)}) ${error.message}`;
      throw error;
    }
  };
}

export function validateArrayItems(itemValidator) {
  const fn = validateArrayItemsHelper(itemValidator);

  return (array) => {
    isArray(array);

    withAggregate({message: 'Errors validating array items'}, ({wrap}) => {
      array.forEach(wrap(fn));
    });

    return true;
  };
}

export function strictArrayOf(itemValidator) {
  return validateArrayItems(itemValidator);
}

export function sparseArrayOf(itemValidator) {
  return validateArrayItems(item => {
    if (item === false || item === null) {
      return true;
    }

    return itemValidator(item);
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

export function isCommentary(commentary) {
  isString(commentary);

  const [firstLine] = commentary.match(/.*/);
  if (!firstLine.replace(/<\/b>/g, '').includes(':</i>')) {
    throw new TypeError(`Missing commentary citation: "${
      firstLine.length > 40
        ? firstLine.slice(0, 40) + '...'
        : firstLine
    }"`);
  }

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
  what: (value) =>
    value === undefined ||
    value === null ||
    isStringNonEmpty(value),
});

export const isContributionList = validateArrayItems(isContribution);

export const isAdditionalFile = validateProperties({
  title: isString,
  description: (value) =>
    value === undefined ||
    value === null ||
    isString(value),
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
