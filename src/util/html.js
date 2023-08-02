// Some really simple functions for formatting HTML content.

import {inspect} from 'util';

import * as commonValidators from '../data/things/validators.js';
import {empty} from './sugar.js';

// COMPREHENSIVE!
// https://html.spec.whatwg.org/multipage/syntax.html#void-elements
export const selfClosingTags = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
];

// Pass to tag() as an attributes key to make tag() return a 8lank string if the
// provided content is empty. Useful for when you'll only 8e showing an element
// according to the presence of content that would 8elong there.
export const onlyIfContent = Symbol();

// Pass to tag() as an attributes key to make children be joined together by the
// provided string. This is handy, for example, for joining lines by <br> tags,
// or putting some other divider between each child. Note this will only have an
// effect if the tag content is passed as an array of children and not a single
// string.
export const joinChildren = Symbol();

// Pass to tag() as an attributes key to prevent additional whitespace from
// being added to the inner start and end of the tag's content - basically,
// ensuring that the start of the content begins immediately after the ">"
// ending the opening tag, and ends immediately before the "<" at the start of
// the closing tag. This has effect when a single child spans multiple lines,
// or when there are multiple children.
export const noEdgeWhitespace = Symbol();

// Note: This is only guaranteed to return true for blanks (as returned by
// html.blank()) and false for Tags and Templates (regardless of contents or
// other properties). Don't depend on this to match any other values.
export function isBlank(value) {
  if (isTag(value)) {
    return false;
  }

  if (isTemplate(value)) {
    return false;
  }

  if (!Array.isArray(value)) {
    return false;
  }

  return value.length === 0;
}

export function isTag(value) {
  return value instanceof Tag;
}

export function isTemplate(value) {
  return value instanceof Template;
}

export function isHTML(value) {
  if (typeof value === 'string') {
    return true;
  }

  if (value === null || value === undefined || value === false) {
    return true;
  }

  if (isBlank(value) || isTag(value) || isTemplate(value)) {
    return true;
  }

  if (Array.isArray(value)) {
    if (value.every(isHTML)) {
      return true;
    }
  }

  return false;
}

export function isAttributes(value) {
  if (typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  if (value === null) {
    return false;
  }

  if (isTag(value) || isTemplate(value)) {
    return false;
  }

  // TODO: Validate attribute values (just the general shape)

  return true;
}

export const validators = {
  // TODO: Move above implementations here and detail errors

  isBlank(value) {
    if (!isBlank(value)) {
      throw new TypeError(`Expected html.blank()`);
    }

    return true;
  },

  isTag(value) {
    if (!isTag(value)) {
      throw new TypeError(`Expected HTML tag`);
    }

    return true;
  },

  isTemplate(value) {
    if (!isTemplate(value)) {
      throw new TypeError(`Expected HTML template`);
    }

    return true;
  },

  isHTML(value) {
    if (!isHTML(value)) {
      throw new TypeError(`Expected HTML content`);
    }

    return true;
  },

  isAttributes(value) {
    if (!isAttributes(value)) {
      throw new TypeError(`Expected HTML attributes`);
    }

    return true;
  },
};

export function blank() {
  return [];
}

export function tag(tagName, ...args) {
  let content;
  let attributes;

  if (
    typeof args[0] === 'object' &&
    !(Array.isArray(args[0]) ||
      args[0] instanceof Tag ||
      args[0] instanceof Template)
  ) {
    attributes = args[0];
    content = args[1];
  } else {
    content = args[0];
  }

  return new Tag(tagName, attributes, content);
}

export function tags(content) {
  return new Tag(null, null, content);
}

export class Tag {
  #tagName = '';
  #content = null;
  #attributes = null;

  constructor(tagName, attributes, content) {
    this.tagName = tagName;
    this.attributes = attributes;
    this.content = content;
  }

  clone() {
    return Reflect.construct(this.constructor, [
      this.tagName,
      this.attributes,
      this.content,
    ]);
  }

  set tagName(value) {
    if (value === undefined || value === null) {
      this.tagName = '';
      return;
    }

    if (typeof value !== 'string') {
      throw new Error(`Expected tagName to be a string`);
    }

    if (selfClosingTags.includes(value) && this.content.length) {
      throw new Error(`Tag <${value}> is self-closing but this tag has content`);
    }

    this.#tagName = value;
  }

  get tagName() {
    return this.#tagName;
  }

  set attributes(attributes) {
    if (attributes instanceof Attributes) {
      this.#attributes = attributes;
    } else {
      this.#attributes = new Attributes(attributes);
    }
  }

  get attributes() {
    if (this.#attributes === null) {
      this.attributes = {};
    }

    return this.#attributes;
  }

  set content(value) {
    if (
      this.selfClosing &&
      !(value === null ||
        value === undefined ||
        !Boolean(value) ||
        Array.isArray(value) && value.filter(Boolean).length === 0)
    ) {
      throw new Error(`Tag <${this.tagName}> is self-closing but got content`);
    }

    let contentArray;

    if (Array.isArray(value)) {
      contentArray = value;
    } else {
      contentArray = [value];
    }

    this.#content = contentArray
      .flat(Infinity)
      .filter(Boolean);

    this.#content.toString = () => this.#stringifyContent();
  }

  get content() {
    if (this.#content === null) {
      this.#content = [];
    }

    return this.#content;
  }

  get selfClosing() {
    if (this.tagName) {
      return selfClosingTags.includes(this.tagName);
    } else {
      return false;
    }
  }

  #setAttributeFlag(attribute, value) {
    if (value) {
      this.attributes.set(attribute, true);
    } else {
      this.attributes.remove(attribute);
    }
  }

  #getAttributeFlag(attribute) {
    return !!this.attributes.get(attribute);
  }

  #setAttributeString(attribute, value) {
    // Note: This function accepts and records the empty string ('')
    // distinctly from null/undefined.

    if (value === undefined || value === null) {
      this.attributes.remove(attribute);
      return undefined;
    } else {
      this.attributes.set(attribute, String(value));
    }
  }

  #getAttributeString(attribute) {
    const value = this.attributes.get(attribute);

    if (value === undefined || value === null) {
      return undefined;
    } else {
      return String(value);
    }
  }

  set onlyIfContent(value) {
    this.#setAttributeFlag(onlyIfContent, value);
  }

  get onlyIfContent() {
    return this.#getAttributeFlag(onlyIfContent);
  }

  set joinChildren(value) {
    this.#setAttributeString(joinChildren, value);
  }

  get joinChildren() {
    return this.#getAttributeString(joinChildren);
  }

  set noEdgeWhitespace(value) {
    this.#setAttributeFlag(noEdgeWhitespace, value);
  }

  get noEdgeWhitespace() {
    return this.#getAttributeFlag(noEdgeWhitespace);
  }

  toString() {
    const attributesString = this.attributes.toString();
    const contentString = this.content.toString();

    if (this.onlyIfContent && !contentString) {
      return '';
    }

    if (!this.tagName) {
      return contentString;
    }

    const openTag = (attributesString
      ? `<${this.tagName} ${attributesString}>`
      : `<${this.tagName}>`);

    if (this.selfClosing) {
      return openTag;
    }

    const closeTag = `</${this.tagName}>`;

    if (!this.content.length) {
      return openTag + closeTag;
    }

    if (!contentString.includes('\n')) {
      return openTag + contentString + closeTag;
    }

    const parts = [
      openTag,
      contentString
        .split('\n')
        .map((line, i) =>
          (i === 0 && this.noEdgeWhitespace
            ? line
            : '    ' + line))
        .join('\n'),
      closeTag,
    ];

    return parts.join(
      (this.noEdgeWhitespace
        ? ''
        : '\n'));
  }

  #stringifyContent() {
    if (this.selfClosing) {
      return '';
    }

    const joiner =
      (this.joinChildren === undefined
        ? '\n'
        : (this.joinChildren === ''
            ? ''
            : `\n${this.joinChildren}\n`));

    return this.content
      .map(item => item.toString())
      .filter(Boolean)
      .join(joiner);
  }

  [inspect.custom]() {
    if (this.tagName) {
      if (empty(this.content)) {
        return `Tag <${this.tagName} />`;
      } else {
        return `Tag <${this.tagName}> (${this.content.length} items)`;
      }
    } else {
      if (empty(this.content)) {
        return `Tag (no name)`;
      } else {
        return `Tag (no name, ${this.content.length} items)`;
      }
    }
  }
}

export class Attributes {
  #attributes = Object.create(null);

  constructor(attributes) {
    this.attributes = attributes;
  }

  set attributes(value) {
    if (value === undefined || value === null) {
      this.#attributes = {};
      return;
    }

    if (typeof value !== 'object') {
      throw new Error(`Expected attributes to be an object`);
    }

    this.#attributes = Object.create(null);
    Object.assign(this.#attributes, value);
  }

  get attributes() {
    return this.#attributes;
  }

  set(attribute, value) {
    if (value === null || value === undefined) {
      this.remove(attribute);
    } else {
      this.#attributes[attribute] = value;
    }
    return value;
  }

  get(attribute) {
    return this.#attributes[attribute];
  }

  remove(attribute) {
    return delete this.#attributes[attribute];
  }

  toString() {
    return Object.entries(this.attributes)
      .map(([key, val]) => {
        if (typeof val === 'undefined' || val === null)
          return [key, val, false];
        else if (typeof val === 'string')
          return [key, val, true];
        else if (typeof val === 'boolean')
          return [key, val, val];
        else if (typeof val === 'number')
          return [key, val.toString(), true];
        else if (Array.isArray(val))
          return [key, val.filter(Boolean).join(' '), val.length > 0];
        else
          throw new Error(`Attribute value for ${key} should be primitive or array, got ${typeof val}`);
      })
      .filter(([_key, _val, keep]) => keep)
      .map(([key, val]) =>
        typeof val === 'boolean'
          ? `${key}`
          : `${key}="${this.#escapeAttributeValue(val)}"`
      )
      .join(' ');
  }

  #escapeAttributeValue(value) {
    return value
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }
}

export function template(description) {
  return new Template(description);
}

export class Template {
  #description = {};
  #slotValues = {};

  constructor(description) {
    if (!description[Stationery.validated]) {
      Template.validateDescription(description);
    }

    this.#description = description;
  }

  clone() {
    const clone = Reflect.construct(this.constructor, [
      this.#description,
    ]);

    clone.setSlots(this.#slotValues);

    return clone;
  }

  static validateDescription(description) {
    if (typeof description !== 'object') {
      throw new TypeError(`Expected object, got ${typeof description}`);
    }

    if (description === null) {
      throw new TypeError(`Expected object, got null`);
    }

    const topErrors = [];

    if (!('content' in description)) {
      topErrors.push(new TypeError(`Expected description.content`));
    } else if (typeof description.content !== 'function') {
      topErrors.push(new TypeError(`Expected description.content to be function`));
    }

    if ('annotation' in description) {
      if (typeof description.annotation !== 'string') {
        topErrors.push(new TypeError(`Expected annotation to be string`));
      }
    }

    if ('slots' in description) validateSlots: {
      if (typeof description.slots !== 'object') {
        topErrors.push(new TypeError(`Expected description.slots to be object`));
        break validateSlots;
      }

      try {
        this.validateSlotsDescription(description.slots);
      } catch (slotError) {
        topErrors.push(slotError);
      }
    }

    if (!empty(topErrors)) {
      throw new AggregateError(topErrors,
        (typeof description.annotation === 'string'
          ? `Errors validating template "${description.annotation}" description`
          : `Errors validating template description`));
    }

    return true;
  }

  static validateSlotsDescription(slots) {
    const slotErrors = [];

    for (const [slotName, slotDescription] of Object.entries(slots)) {
      if (typeof slotDescription !== 'object' || slotDescription === null) {
        slotErrors.push(new TypeError(`(${slotName}) Expected slot description to be object`));
        continue;
      }

      if ('default' in slotDescription) validateDefault: {
        if (
          slotDescription.default === undefined ||
          slotDescription.default === null
        ) {
          slotErrors.push(new TypeError(`(${slotName}) Leave slot default unspecified instead of undefined or null`));
          break validateDefault;
        }

        try {
          Template.validateSlotValueAgainstDescription(slotDescription.default, slotDescription);
        } catch (error) {
          error.message = `(${slotName}) Error validating slot default value: ${error.message}`;
          slotErrors.push(error);
        }
      }

      if ('validate' in slotDescription && 'type' in slotDescription) {
        slotErrors.push(new TypeError(`(${slotName}) Don't specify both slot validate and type`));
      } else if (!('validate' in slotDescription || 'type' in slotDescription)) {
        slotErrors.push(new TypeError(`(${slotName}) Expected either slot validate or type`));
      } else if ('validate' in slotDescription) {
        if (typeof slotDescription.validate !== 'function') {
          slotErrors.push(new TypeError(`(${slotName}) Expected slot validate to be function`));
        }
      } else if ('type' in slotDescription) {
        const acceptableSlotTypes = [
          'string',
          'number',
          'bigint',
          'boolean',
          'symbol',
          'html',
        ];

        if (slotDescription.type === 'function') {
          slotErrors.push(new TypeError(`(${slotName}) Functions shouldn't be provided to slots`));
        } else if (slotDescription.type === 'object') {
          slotErrors.push(new TypeError(`(${slotName}) Provide validate function instead of type: object`));
        } else if (!acceptableSlotTypes.includes(slotDescription.type)) {
          slotErrors.push(new TypeError(`(${slotName}) Expected slot type to be one of ${acceptableSlotTypes.join(', ')}`));
        }
      }
    }

    if (!empty(slotErrors)) {
      throw new AggregateError(slotErrors, `Errors in slot descriptions`);
    }

    return true;
  }

  slot(slotName, value) {
    this.setSlot(slotName, value);
    return this;
  }

  slots(slotNamesToValues) {
    this.setSlots(slotNamesToValues);
    return this;
  }

  setSlot(slotName, value) {
    const description = this.#getSlotDescriptionOrError(slotName);

    try {
      Template.validateSlotValueAgainstDescription(value, description);
    } catch (error) {
      error.message =
        (this.description.annotation
          ? `Error validating template "${this.description.annotation}" slot "${slotName}" value: ${error.message}`
          : `Error validating template slot "${slotName}" value: ${error.message}`);
      throw error;
    }

    this.#slotValues[slotName] = value;
  }

  setSlots(slotNamesToValues) {
    if (
      typeof slotNamesToValues !== 'object' ||
      Array.isArray(slotNamesToValues) ||
      slotNamesToValues === null
    ) {
      throw new TypeError(`Expected object mapping of slot names to values`);
    }

    const slotErrors = [];

    for (const [slotName, value] of Object.entries(slotNamesToValues)) {
      const description = this.#getSlotDescriptionNoError(slotName);
      if (!description) {
        slotErrors.push(new TypeError(`(${slotName}) Template doesn't have a "${slotName}" slot`));
        continue;
      }

      try {
        Template.validateSlotValueAgainstDescription(value, description);
      } catch (error) {
        error.message = `(${slotName}) ${error.message}`;
        slotErrors.push(error);
      }
    }

    if (!empty(slotErrors)) {
      throw new AggregateError(slotErrors,
        (this.description.annotation
          ? `Error validating template "${this.description.annotation}" slots`
          : `Error validating template slots`));
    }

    Object.assign(this.#slotValues, slotNamesToValues);
  }

  static validateSlotValueAgainstDescription(value, description) {
    if (value === undefined) {
      throw new TypeError(`Specify value as null or don't specify at all`);
    }

    // Null is always an acceptable slot value.
    if (value !== null) {
      if ('validate' in description) {
        description.validate({
          ...commonValidators,
          ...validators,
        })(value);
      }

      if ('type' in description) {
        const {type} = description;
        if (type === 'html') {
          if (!isHTML(value)) {
            throw new TypeError(`Slot expects html (tag, template or blank), got ${typeof value}`);
          }
        } else {
          if (typeof value !== type) {
            throw new TypeError(`Slot expects ${type}, got ${typeof value}`);
          }
        }
      }
    }

    return true;
  }

  getSlotValue(slotName) {
    const description = this.#getSlotDescriptionOrError(slotName);
    const providedValue = this.#slotValues[slotName] ?? null;

    if (description.type === 'html') {
      if (!providedValue) {
        return blank();
      }

      if (providedValue instanceof Tag || providedValue instanceof Template) {
        return providedValue.clone();
      }

      return providedValue;
    }

    if (providedValue !== null) {
      return providedValue;
    }

    if ('default' in description) {
      return description.default;
    }

    return null;
  }

  getSlotDescription(slotName) {
    return this.#getSlotDescriptionOrError(slotName);
  }

  #getSlotDescriptionNoError(slotName) {
    if (this.#description.slots) {
      if (Object.hasOwn(this.#description.slots, slotName)) {
        return this.#description.slots[slotName];
      }
    }

    return null;
  }

  #getSlotDescriptionOrError(slotName) {
    const description = this.#getSlotDescriptionNoError(slotName);

    if (!description) {
      throw new TypeError(
        (this.description.annotation
          ? `Template "${this.description.annotation}" doesn't have a "${slotName}" slot`
          : `Template doesn't have a "${slotName}" slot`));
    }

    return description;
  }

  set content(_value) {
    throw new Error(`Template content can't be changed after constructed`);
  }

  get content() {
    const slots = {};

    for (const slotName of Object.keys(this.description.slots ?? {})) {
      slots[slotName] = this.getSlotValue(slotName);
    }

    // Get outta here with that recursive Template bollocks!
    const content = this.description.content(slots);
    if (content instanceof Template) {
      return content.content;
    } else {
      return content;
    }
  }

  set description(_value) {
    throw new Error(`Template description can't be changed after constructed`);
  }

  get description() {
    return this.#description;
  }

  toString() {
    return this.content.toString();
  }

  [inspect.custom]() {
    const {annotation} = this.description;
    if (annotation) {
      return `Template "${annotation}"`;
    } else {
      return `Template (no annotation)`;
    }
  }
}

export function stationery(description) {
  return new Stationery(description);
}

export class Stationery {
  #templateDescription = null;

  static validated = Symbol('Stationery.validated');

  constructor(templateDescription) {
    Template.validateDescription(templateDescription);
    templateDescription[Stationery.validated] = true;
    this.#templateDescription = templateDescription;
  }

  template() {
    return new Template(this.#templateDescription);
  }

  [inspect.custom]() {
    const {annotation} = this.#templateDescription;
    if (annotation) {
      return `Stationery "${annotation}"`;
    } else {
      return `Stationery (no annotation)`;
    }
  }
}
