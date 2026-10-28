// A path with no file extension is a page of the single-page app (/, /play/<assignment>,
// /playground): it reads index.html, and the app routes it. /api/* never reaches this function.
function handler(event) {
  var request = event.request;
  var last = request.uri.split("/").pop();
  if (last.indexOf(".") === -1) {
    request.uri = "/index.html";
  }
  return request;
}
