(function () {
  const destination = new URL('/login', window.location.href);
  destination.search = window.location.search;
  destination.hash = window.location.hash;
  window.location.replace(destination.href);
}());
