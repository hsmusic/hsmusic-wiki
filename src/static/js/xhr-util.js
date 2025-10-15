/**
 * This fetch function is adapted from a `loadImage` function
 * credited to Parziphal, Feb 13, 2017.
 * https://stackoverflow.com/a/42196770
 *
 * The callback is generally run with the loading progress as a decimal 0-1.
 * However, if it's not possible to compute the progress ration (which might
 * only become apparent after a progress amount *has* been sent!),
 * the callback will be run with the value -1.
 *
 * The return promise resolves to a manually instantiated Response object
 * which generally behaves the same as a normal fetch response; access headers,
 * text, blob, arrayBuffer as usual. Accordingly, non-200 responses do *not*
 * reject the prmoise, so be sure to check the response status yourself.
 */
export function fetchWithProgress(url, progressCallback) {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    let notifiedNotComputable = false;

    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onprogress = event => {
      if (notifiedNotComputable) {
        return;
      }

      if (!event.lengthComputable) {
        notifiedNotComputable = true;
        progressCallback(-1);
        return;
      }

      progressCallback(event.loaded / event.total);
    };

    xhr.onloadend = () => {
      const body = xhr.response;

      const options = {
        status: xhr.status,
        headers:
          parseResponseHeaders(xhr.getAllResponseHeaders()),
      };

      resolve(new Response(body, options));
    };

    xhr.send();
  });

  function parseResponseHeaders(headers) {
    return (
      Object.fromEntries(
        headers
          .trim()
          .split(/[\r\n]+/)
          .map(line => line.match(/(.+?):\s*(.+)/))
          .map(match => [match[1], match[2]])));
  }
}
