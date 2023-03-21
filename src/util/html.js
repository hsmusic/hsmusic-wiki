// Some really simple functions for formatting HTML content.

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

export function tag(tagName, ...args) {
  let content;
  let attributes;

  if (
    typeof args[0] === 'object' &&
    !(Array.isArray(args[0]) ||
      args[0] instanceof Tag ||
      args[0] instanceof Template ||
      args[0] instanceof Slot)
  ) {
    attributes = args[0];
    content = args[1];
  } else {
    content = args[0];
  }

  return new Tag(tagName, attributes, content);
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
      .flatMap(value => {
        if (Array.isArray(value)) {
          return value;
        } else {
          return [value];
        }
      })
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
        if (val instanceof Slot) {
          const content = val.toString();
          return [key, content, !!content];
        } else {
          return [key, val];
        }
      })
      .map(([key, val, keepSlot]) => {
        if (typeof val === 'undefined' || val === null)
          return [key, val, false];
        else if (typeof val === 'string')
          return [key, val, keepSlot ?? true];
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
      .map(([key, val]) => {
        switch (key) {
          case 'href':
            return [key, encodeURI(val)];
          default:
            return [key, val];
        }
      })
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

export function template(getContent) {
  return new Template(getContent);
}

export class Template {
  #tag = new Tag();
  #slotContents = {};

  constructor(getContent) {
    this.#prepareContent(getContent);
  }

  #prepareContent(getContent) {
    const slotFunction = (slotName, defaultValue) => {
      return new Slot(this, slotName, defaultValue);
    };

    this.#tag.content = getContent(slotFunction);
  }

  slot(slotName, content) {
    this.setSlot(slotName, content);
    return this;
  }

  setSlot(slotName, content) {
    return this.#slotContents[slotName] = new Tag(null, null, content);
  }

  getSlot(slotName) {
    if (this.#slotContents[slotName]) {
      return this.#slotContents[slotName];
    } else {
      return [];
    }
  }

  set content(_value) {
    throw new Error(`Template content can't be changed after constructed`);
  }

  get content() {
    return this.#tag.content;
  }

  toString() {
    return this.content.toString();
  }
}

export class Slot {
  #defaultTag = new Tag();

  constructor(template, slotName, defaultContent) {
    if (!template) {
      throw new Error(`Expected template`);
    }

    if (typeof slotName !== 'string') {
      throw new Error(`Expected slotName to be string, got ${slotName}`);
    }

    this.template = template;
    this.slotName = slotName;
    this.defaultContent = defaultContent;
  }

  set defaultContent(value) {
    this.#defaultTag.content = value;
  }

  get defaultContent() {
    return this.#defaultTag.content;
  }

  set content(value) {
    // Content is stored on the template rather than the slot itself so that
    // a given slot name can be reused (i.e. two slots can share a name and
    // will be filled with the same value).
    this.template.setSlot(this.slotName, value);
  }

  get content() {
    const contentTag = this.template.getSlot(this.slotName);
    return contentTag?.content ?? this.#defaultTag.content;
  }

  toString() {
    return this.content.toString();
  }
}
