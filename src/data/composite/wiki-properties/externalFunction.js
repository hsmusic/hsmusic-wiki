// External function. These should only be used as dependencies for other
// properties, so they're left unexposed.

// TODO: Not templateCompositeFrom.

export default function() {
  return {
    flags: {update: true},
    update: {validate: (t) => typeof t === 'function'},
  };
}
