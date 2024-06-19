// Another old, unused chunk of code.

/*
const language = document.documentElement.getAttribute('lang');

let list;
if (typeof Intl === 'object' && typeof Intl.ListFormat === 'function') {
  const getFormat = (type) => {
    const formatter = new Intl.ListFormat(language, {type});
    return formatter.format.bind(formatter);
  };

  list = {
    conjunction: getFormat('conjunction'),
    disjunction: getFormat('disjunction'),
    unit: getFormat('unit'),
  };
} else {
  // Not a gr8 mock we've got going here, 8ut it's *mostly* language-free.
  // We use the same mock for every list 'cuz we don't have any of the
  // necessary CLDR info to appropri8tely distinguish 8etween them.
  const arbitraryMock = (array) => array.join(', ');

  list = {
    conjunction: arbitraryMock,
    disjunction: arbitraryMock,
    unit: arbitraryMock,
  };
}
*/
