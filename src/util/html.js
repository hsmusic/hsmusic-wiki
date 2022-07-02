/** @format */

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

export function tag(tagName, ...args) {
  const selfClosing = selfClosingTags.includes(tagName);

  let openTag;
  let content;
  let attrs;

  if (typeof args[0] === 'object' && !Array.isArray(args[0])) {
    attrs = args[0];
    content = args[1];
  } else {
    content = args[0];
  }

  if (selfClosing && content) {
    throw new Error(`Tag <${tagName}> is self-closing but got content!`);
  }

  if (attrs?.[onlyIfContent] && !content) {
    return '';
  }

  if (attrs) {
    const attrString = attributes(args[0]);
    if (attrString) {
      openTag = `${tagName} ${attrString}`;
    }
  }

  if (!openTag) {
    openTag = tagName;
  }

  if (Array.isArray(content)) {
    const joiner = attrs?.[joinChildren];
    content = content.filter(Boolean).join(
      (joiner
        ? `\n${joiner}\n`
        : '\n'));
  }

  if (content) {
    if (content.includes('\n')) {
      return (
        `<${openTag}>\n` +
        content
          .split('\n')
          .map((line) => '    ' + line + '\n')
          .join('') +
        `</${tagName}>`
      );
    } else {
      return `<${openTag}>${content}</${tagName}>`;
    }
  } else {
    if (selfClosing) {
      return `<${openTag}>`;
    } else {
      return `<${openTag}></${tagName}>`;
    }
  }
}

export function escapeAttributeValue(value) {
  return value.replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export function attributes(attribs) {
  return Object.entries(attribs)
    .map(([key, val]) => {
      if (typeof val === 'undefined' || val === null) return [key, val, false];
      else if (typeof val === 'string') return [key, val, true];
      else if (typeof val === 'boolean') return [key, val, val];
      else if (typeof val === 'number') return [key, val.toString(), true];
      else if (Array.isArray(val))
        return [key, val.filter(Boolean).join(' '), val.length > 0];
      else
        throw new Error(
          `Attribute value for ${key} should be primitive or array, got ${typeof val}`
        );
    })
    .filter(([_key, _val, keep]) => keep)
    .map(([key, val]) =>
      typeof val === 'boolean'
        ? `${key}`
        : `${key}="${escapeAttributeValue(val)}"`
    )
    .join(' ');
}
