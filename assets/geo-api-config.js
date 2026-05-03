(function () {
  if (typeof window === "undefined") return;
  if (Object.prototype.hasOwnProperty.call(window, "__GEO_API_BASE__")) return;
  var loc = window.location;
  /* file:// — тікелей API (портты .env-пен сәйкестендіріңіз) */
  if (loc.protocol !== "http:" && loc.protocol !== "https:") {
    window.__GEO_API_BASE__ = "http://127.0.0.1:3001";
    return;
  }
  /*
   * http(s): бір серверде сайт + API болса — бос жол (same-origin /api/...).
   * Басқа dev server (мысалы 5500) болса — төмендегі fallback қолданылады.
   */
  var port = String(loc.port || (loc.protocol === "https:" ? "443" : "80"));
  var integratedPorts = { "3000": 1, "3001": 1, "8080": 1 };
  if (integratedPorts[port]) {
    window.__GEO_API_BASE__ = "";
    return;
  }
  window.__GEO_API_BASE__ = "http://127.0.0.1:3001";
})();
