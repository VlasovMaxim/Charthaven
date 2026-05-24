/**
 * Светлая / тёмная тема: localStorage chart-theme; для авторизованных — также Profile.ui_theme на сервере.
 */
(function () {
  var KEY = "chart-theme";
  var API_URL = "/api/user-theme/";

  function getCookie(name) {
    var m = document.cookie.match(
      "(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)"
    );
    return m ? decodeURIComponent(m[1]) : "";
  }

  function getTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light";
  }

  function syncMeta(theme) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "dark" ? "#0d1829" : "#01295f");
    }
  }

  function apply(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    syncMeta(theme);
    var btn = document.getElementById("themeToggle");
    if (btn) {
      btn.setAttribute(
        "aria-label",
        theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"
      );
    }
  }

  if (getTheme() === "dark") {
    syncMeta("dark");
  }

  document.addEventListener("DOMContentLoaded", function () {
    try {
      if (
        typeof window.__CHART_UI_THEME__ === "string" &&
        (window.__CHART_UI_THEME__ === "dark" ||
          window.__CHART_UI_THEME__ === "light")
      ) {
        localStorage.setItem(KEY, window.__CHART_UI_THEME__);
      }
    } catch (e) {}

    apply(getTheme());
    var btn = document.getElementById("themeToggle");
    if (btn) {
      btn.addEventListener("click", function () {
        var next = getTheme() === "dark" ? "light" : "dark";
        apply(next);
        try {
          localStorage.setItem(KEY, next);
        } catch (e) {}
        if (
          typeof window.isAuthenticated !== "undefined" &&
          window.isAuthenticated
        ) {
          var csrf = getCookie("csrftoken");
          var headers = { "Content-Type": "application/json" };
          if (csrf) headers["X-CSRFToken"] = csrf;
          fetch(API_URL, {
            method: "POST",
            credentials: "same-origin",
            headers: headers,
            body: JSON.stringify({ theme: next }),
          }).catch(function () {});
        }
        document.dispatchEvent(
          new CustomEvent("chart-theme-changed", { detail: { theme: next } })
        );
      });
    }
  });
})();
