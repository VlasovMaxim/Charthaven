/* Charthaven: инициализация при DOMContentLoaded (восстановление вкладок, бургер). */
// Привязка сохранения к изменениям в input'ах и select'ах
document.addEventListener("DOMContentLoaded", () => {
  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", clearChartWorkspaceLocalStorage);
  }

  restoreGraphFromLocalStorage();
  restoreSettingsFromLocalStorage();
  restoreAdvancedAppearanceFromLocalStorage();
  document.addEventListener("chart-theme-changed", onInterfaceThemeChanged);

  const savedTabId = localStorage.getItem("activeTab");
  const guestCannotUseTab3 =
    savedTabId === "tab-3" &&
    typeof window.isAuthenticated !== "undefined" &&
    !window.isAuthenticated;
  const tabIdToRestore = guestCannotUseTab3 ? "tab-1" : savedTabId;
  if (tabIdToRestore) {
      // Удаляем активность со всех вкладок и контента
      document.querySelectorAll(".tab-item").forEach((tab) => {
        tab.classList.remove("active");
        if (tab.dataset.tab === tabIdToRestore) {
          tab.classList.add("active");
        }
      });

      document.querySelectorAll(".tab-content").forEach((content) => {
        content.classList.remove("active");
        if (content.id === tabIdToRestore) {
          content.classList.add("active");
        }
      });
      if (guestCannotUseTab3) {
        localStorage.setItem("activeTab", "tab-1");
      }
  }

  if (
    savedTabId === "tab-3" &&
    typeof window.isAuthenticated !== "undefined" &&
    window.isAuthenticated
  ) {
    loadSavedCharts();
  }

  const tab2Panel = document.getElementById("tab-2");
  if (tab2Panel) {
    const persistChartTypeSettings = (ev) => {
      if (currentChartType) saveSettingsToLocalStorage();
      saveAdvancedAppearanceToLocalStorage();
      if (ev && ev.target && ev.target.id === "chart-bg-color") {
        relayoutChartBackgroundIfPresent();
      }
      if (
        ev &&
        ev.target &&
        (ev.target.id === "chart-font-color" ||
          ev.target.id === "chart-font-family")
      ) {
        relayoutAppearanceFontsIfPresent();
      }
    };
    tab2Panel.addEventListener("input", persistChartTypeSettings);
    tab2Panel.addEventListener("change", persistChartTypeSettings);
  }

  const advToggle = document.getElementById("toggle-advanced-settings-btn");
  const advPanel = document.getElementById("advanced-settings");
  if (advToggle && advPanel) {
    advToggle.addEventListener("click", () => {
      const opening = !advPanel.classList.contains("advanced-settings--open");
      if (opening) {
        advPanel.removeAttribute("inert");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            advPanel.classList.add("advanced-settings--open");
          });
        });
        advToggle.setAttribute("aria-expanded", "true");
      } else {
        advPanel.classList.remove("advanced-settings--open");
        advToggle.setAttribute("aria-expanded", "false");
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          advPanel.setAttribute("inert", "");
        } else {
          const onEnd = (e) => {
            if (e.propertyName !== "max-height") return;
            advPanel.setAttribute("inert", "");
            advPanel.removeEventListener("transitionend", onEnd);
          };
          advPanel.addEventListener("transitionend", onEnd);
        }
      }
    });
  }

    // — при клике на вкладку «Созданные графики» (если не загрузили при восстановлении activeTab)
    const tab3 = document.querySelector('.tab-item[data-tab="tab-3"]');
    if (tab3) tab3.addEventListener("click", loadSavedCharts);

    const savedSearch = document.getElementById("saved-charts-search");
    if (savedSearch) {
      savedSearch.addEventListener("input", () => {
        if (savedChartsSearchTimer) clearTimeout(savedChartsSearchTimer);
        savedChartsSearchTimer = setTimeout(() => {
          renderSavedChartsList();
        }, 200);
      });
    }
    ["saved-charts-sort", "saved-charts-group"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", () => renderSavedChartsList());
    });
});

document.addEventListener("DOMContentLoaded", function () {
  const burgerBtn = document.getElementById("burgerBtn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  function setMobileNavOpen(open) {
    if (!sidebar || !overlay) return;
    sidebar.classList.toggle("open", open);
    overlay.style.display = open ? "block" : "none";
    if (burgerBtn) {
      burgerBtn.classList.toggle("burger--open", open);
      burgerBtn.setAttribute("aria-expanded", open ? "true" : "false");
      burgerBtn.setAttribute(
        "aria-label",
        open ? "Закрыть меню" : "Открыть меню"
      );
    }
  }
  if (burgerBtn && sidebar && overlay) {
    burgerBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      setMobileNavOpen(!sidebar.classList.contains("open"));
    });
    overlay.addEventListener("click", function () {
      setMobileNavOpen(false);
    });
  }
});


