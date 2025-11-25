export function getOutputName({property, from, prefix = null}) {
  if (property && prefix) {
    return `${prefix}.${property}`;
  } else if (property && from) {
    return `${from}.${property}`;
  } else {
    if (!property) throw new Error(`guard property outside getOutputName(), c'mon`);
    if (!from) throw new Error(`guard from in getOutputName(), c'mon`);
  }
}