/* Charthaven: список «Созданные графики», загрузка/удаление сохранённых. */
const CHART_TYPE_LABELS_RU = {
  line: "Линейный",
  bar: "Столбчатый",
  pie: "Круговая",
  hist: "Гистограмма",
  scatter: "Точечная",
  area: "С областями",
};

function chartTypeLabelRu(type) {
  return CHART_TYPE_LABELS_RU[type] || type;
}

let savedChartsCache = [];
let savedChartsSearchTimer = null;
let pendingDeleteSavedChartId = null;

function setPieColorsFromSettings(colors) {
  const pieColorContainer = document.getElementById("pie-custom-colors");
  if (!pieColorContainer) return;
  const buttonsWrap = pieColorContainer.querySelector(".pie-color-buttons");
  if (!buttonsWrap) return;

  pieColorContainer.querySelectorAll(".input-color").forEach((el) => el.remove());
  const list =
    Array.isArray(colors) && colors.length > 0 ? colors : ["#437F97"];
  /* Вставляем перед .pie-color-buttons: прямой потомок контейнера — иначе insertBefore с кнопкой даёт DOMException. */
  for (let i = list.length - 1; i >= 0; i--) {
    const input = document.createElement("input");
    input.type = "color";
    input.className = "input-color";
    input.value = list[i];
    pieColorContainer.insertBefore(input, buttonsWrap);
  }
  try {
    localStorage.setItem("pieChartColors", JSON.stringify(list));
  } catch (e) {
    /* ignore */
  }
}

/** После загрузки сохранённого графика: данные файла, вкладки, поля настроек */
function applySavedChartContext(obj) {
  const chartType = obj.chartType;
  const settings = obj.settings || {};
  const columns = obj.columns || [];
  const previewHtml = obj.previewHtml || "";
  const uploadedFileId = obj.uploadedFileId;
  const fileName = obj.fileName || "";

  if (!chartType || !CHART_TYPES.includes(chartType)) return;

  localStorage.setItem("uploadedFileId", String(uploadedFileId));
  localStorage.setItem("uploadedFileName", fileName);
  localStorage.setItem("chartColumns", JSON.stringify(columns));
  localStorage.setItem("chartPreview", previewHtml);
  localStorage.setItem("fileUploaded", "true");

  availableColumns = columns;

  const preview = document.getElementById("data-preview");
  if (preview && previewHtml) {
    preview.innerHTML = previewHtml;
    preview.style.display = "block";
    preview.classList.add("show");
  }
  const delBtn = document.getElementById("delete-file-btn");
  if (delBtn) delBtn.style.display = "inline-block";
  const errEl = document.getElementById("error-message");
  if (errEl) errEl.style.display = "none";

  document.querySelectorAll(".tab-item").forEach((tab) => {
    if (tab.dataset.tab === "tab-2" || tab.dataset.tab === "tab-3") {
      tab.classList.remove("disabled");
    }
  });

  document.getElementById("chart-type").value = chartType;
  currentChartType = chartType;

  document.querySelectorAll(".chart-card").forEach((c) => c.classList.remove("active"));
  const card = document.querySelector(`.chart-card[data-type="${chartType}"]`);
  if (card) card.classList.add("active");
  document.querySelectorAll(".chart-settings").forEach((s) => s.classList.add("hidden"));
  const targetSettings = document.getElementById(`${chartType}-chart-settings`);
  if (targetSettings) targetSettings.classList.remove("hidden");

  updateAxisOptions(availableColumns, chartType);

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val != null && val !== "") el.value = val;
  };

  /** Только если такой option есть — иначе оставляем первый столбец из updateAxisOptions. */
  const setAxisIfValid = (id, val) => {
    if (val == null || val === "") return;
    const el = document.getElementById(id);
    if (!el || el.tagName !== "SELECT") return;
    const opts = Array.from(el.options).map((o) => o.value);
    if (opts.length && opts.includes(String(val))) el.value = val;
  };

  const title =
    settings.chartTitle ||
    document.getElementById(`${chartType}-title`)?.value ||
    "";
  setVal(`${chartType}-title`, settings.chartTitle);
  const titleHeader = document.getElementById("chart-title-header");
  if (titleHeader) titleHeader.textContent = title || "";

  if (chartType === "line") {
    setAxisIfValid("line-x-axis", settings.xAxis);
    setAxisIfValid("line-y-axis", settings.yAxis);
    setVal("line-x-axis-label", settings.xLabel);
    setVal("line-y-axis-label", settings.yLabel);
    setVal("line-color", settings.chartColor);
    setVal("line-width", settings.lineWidth);
    const lwv = document.getElementById("line-width-value");
    if (lwv) lwv.textContent = settings.lineWidth || 2;
    setVal("line-style", settings.lineStyle);
  } else if (chartType === "bar" || chartType === "scatter" || chartType === "area") {
    setAxisIfValid(`${chartType}-x-axis`, settings.xAxis);
    setAxisIfValid(`${chartType}-y-axis`, settings.yAxis);
    setVal(`${chartType}-x-axis-label`, settings.xLabel);
    setVal(`${chartType}-y-axis-label`, settings.yLabel);
    setVal(`${chartType}-color`, settings.chartColor);
  } else if (chartType === "pie") {
    setAxisIfValid("pie-x-axis", settings.xAxis);
    setAxisIfValid("pie-y-axis", settings.yAxis);
    setVal("pie-title", settings.chartTitle);
    const pieCols = Array.isArray(settings.chartColors) ? settings.chartColors : [];
    setPieColorsFromSettings(pieCols.length ? pieCols : null);
  } else if (chartType === "hist") {
    setAxisIfValid("hist-x-axis", settings.xAxis);
    setVal("hist-x-axis-label", settings.xLabel);
    setVal("hist-bins", settings.bins);
    setVal("hist-color", settings.chartColor);
    setVal("hist-title", settings.chartTitle);
  }

  const layoutJson = obj.layoutJson || {};
  applyAppearanceFieldsToForm(
    mergeAppearanceFromSaved(
      buildAppearanceRawFromSettingsAndLayout(settings, layoutJson)
    )
  );
  saveAdvancedAppearanceToLocalStorage();

  saveSettingsToLocalStorage();

  activateTabById("tab-2");
}

function filterSortSavedCharts(list, query, sortKey, groupKey) {
  let rows = list.slice();
  const q = (query || "").trim().toLowerCase();
  if (q) {
    rows = rows.filter((ch) => {
      const title = (ch.chartTitle || "").toLowerCase();
      const file = (ch.fileName || "").toLowerCase();
      const typ = chartTypeLabelRu(ch.chartType).toLowerCase();
      return (
        file.includes(q) ||
        title.includes(q) ||
        typ.includes(q) ||
        (ch.chartType || "").toLowerCase().includes(q)
      );
    });
  }

  const sortFn = {
    date_desc: (a, b) =>
      new Date(b.createdAtIso || 0) - new Date(a.createdAtIso || 0),
    date_asc: (a, b) =>
      new Date(a.createdAtIso || 0) - new Date(b.createdAtIso || 0),
    file_asc: (a, b) =>
      (a.fileName || "").localeCompare(b.fileName || "", "ru"),
    title_asc: (a, b) =>
      (a.chartTitle || "").localeCompare(b.chartTitle || "", "ru"),
    type_asc: (a, b) =>
      (a.chartType || "").localeCompare(b.chartType || "", "ru"),
  };
  const fn = sortFn[sortKey] || sortFn.date_desc;
  rows.sort(fn);

  if (groupKey === "none" || !groupKey) {
    return [{ key: "", label: "", items: rows }];
  }

  const groups = new Map();
  rows.forEach((ch) => {
    let gk = "";
    if (groupKey === "file") gk = ch.fileName || "—";
    else if (groupKey === "type") gk = chartTypeLabelRu(ch.chartType);
    else if (groupKey === "day") {
      try {
        gk = new Date(ch.createdAtIso).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      } catch (e) {
        gk = (ch.createdAt || "").split(" ")[0] || "";
      }
    }
    if (!groups.has(gk)) groups.set(gk, []);
    groups.get(gk).push(ch);
  });
  const order = Array.from(groups.keys()).sort((a, b) =>
    String(a).localeCompare(String(b), "ru")
  );
  return order.map((key) => ({
    key,
    label: key,
    items: groups.get(key),
  }));
}

function renderSavedChartsList() {
  const container = document.getElementById("savedChartsContainer");
  const msg = document.getElementById("saved-charts-message");
  if (!container) return;

  const searchEl = document.getElementById("saved-charts-search");
  const sortEl = document.getElementById("saved-charts-sort");
  const groupEl = document.getElementById("saved-charts-group");
  const query = searchEl ? searchEl.value : "";
  const sortKey = sortEl ? sortEl.value : "date_desc";
  const groupKey = groupEl ? groupEl.value : "none";

  container.innerHTML = "";

  if (!savedChartsCache.length) {
    if (msg) {
      msg.hidden = false;
      msg.textContent = "Нет сохранённых графиков.";
    }
    return;
  }

  const grouped = filterSortSavedCharts(
    savedChartsCache,
    query,
    sortKey,
    groupKey
  );
  const flatCount = grouped.reduce((n, g) => n + g.items.length, 0);

  if (flatCount === 0) {
    if (msg) {
      msg.hidden = false;
      msg.textContent = "Ничего не найдено. Измените запрос или сбросьте поиск.";
    }
    return;
  }

  if (msg) {
    msg.hidden = true;
  }

  grouped.forEach((group) => {
    if (group.label) {
      const h = document.createElement("h3");
      h.className = "saved-charts-group-title";
      h.textContent = group.label;
      container.appendChild(h);
    }
    const wrap = document.createElement("div");
    wrap.className = "saved-charts-cards";
    group.items.forEach((ch) => {
      const row = document.createElement("div");
      row.className = "saved-chart-card-row";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "saved-chart-card";
      btn.dataset.id = String(ch.id);
      const dispTitle =
        (ch.chartTitle && ch.chartTitle.trim()) || "Без названия";
      btn.innerHTML = `
        <span class="saved-chart-card__title">${escapeHtml(dispTitle)}</span>
        <span class="saved-chart-card__line">${escapeHtml(ch.fileName)}</span>
        <span class="saved-chart-card__line">${escapeHtml(
          chartTypeLabelRu(ch.chartType)
        )} · ${escapeHtml(ch.createdAt)}</span>
      `;
      btn.addEventListener("click", () => loadSavedChart(ch.id));

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "saved-chart-delete";
      delBtn.setAttribute("aria-label", "Удалить график");
      delBtn.title = "Удалить";
      delBtn.textContent = "×";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteSavedChart(ch.id);
      });

      row.appendChild(btn);
      row.appendChild(delBtn);
      wrap.appendChild(row);
    });
    container.appendChild(wrap);
  });
}

function deleteSavedChart(chartId) {
  if (typeof window.isAuthenticated !== "undefined" && !window.isAuthenticated) {
    showCustomAlert("Пожалуйста, войдите в аккаунт.");
    return;
  }
  pendingDeleteSavedChartId = chartId;
  const modal = document.getElementById("deleteSavedChartModal");
  const msgEl = document.getElementById("delete-saved-chart-message");
  if (msgEl) {
    const ch = savedChartsCache.find((c) => c.id === chartId);
    const t = ch && ch.chartTitle ? String(ch.chartTitle).trim() : "";
    msgEl.textContent = t
      ? `Удалить сохранённый график «${t}»?`
      : "Удалить этот сохранённый график?";
  }
  if (modal) modal.classList.add("show");
}

function executeDeleteSavedChartRequest(chartId) {
  const delHdr = {};
  const csrfDel = getCsrfToken();
  if (csrfDel) delHdr["X-CSRFToken"] = csrfDel;
  fetch(`/api/saved-charts/${chartId}/`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: delHdr,
  })
    .then((res) => {
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          showCustomAlert("Пожалуйста, войдите в аккаунт.");
          return Promise.reject("Не авторизован");
        }
        return Promise.reject("Ошибка удаления");
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return Promise.reject("Не JSON");
      }
      return res.json();
    })
    .then(() => {
      savedChartsCache = savedChartsCache.filter((c) => c.id !== chartId);
      renderSavedChartsList();
      showCustomAlert("График удалён.");
    })
    .catch((err) => {
      console.error("Не удалось удалить график:", err);
      showCustomAlert("Не удалось удалить график.");
    });
}

// Функция загрузки списка сохранённых графиков
function loadSavedCharts() {
  if (typeof window.isAuthenticated !== "undefined" && !window.isAuthenticated) {
    showCustomAlert("Пожалуйста, войдите в аккаунт, чтобы просматривать сохранённые графики.");
    activateTabById("tab-1");
    return;
  }
  fetch("/api/saved-charts/")
    .then((res) => {
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          showCustomAlert("Пожалуйста, войдите в аккаунт, чтобы просматривать сохранённые графики.");
          return Promise.reject("Не авторизован");
        }
        return Promise.reject("Ошибка загрузки графиков");
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        showCustomAlert("Ошибка: сервер вернул невалидный ответ. Возможно, вы не авторизованы.");
        return Promise.reject("Не JSON");
      }
      return res.json();
    })
    .then((data) => {
      savedChartsCache = data.charts || [];
      renderSavedChartsList();
    })
    .catch((err) => console.error("Не удалось получить сохранённые графики:", err));
}

// Функция загрузки одного сохранённого графика по его ID
function loadSavedChart(chartId) {
  if (typeof window.isAuthenticated !== "undefined" && !window.isAuthenticated) {
    showCustomAlert("Пожалуйста, войдите в аккаунт, чтобы просматривать сохранённые графики.");
    return;
  }
  fetch(`/api/saved-charts/${chartId}/`)
    .then((res) => {
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          showCustomAlert("Пожалуйста, войдите в аккаунт, чтобы просматривать сохранённые графики.");
          return Promise.reject("Не авторизован");
        }
        return Promise.reject("Ошибка загрузки графика");
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        showCustomAlert("Ошибка: сервер вернул невалидный ответ. Возможно, вы не авторизованы.");
        return Promise.reject("Не JSON");
      }
      return res.json();
    })
    .then((obj) => {
      const { chartType, dataJson, layoutJson } = obj;
      const appearanceRaw = buildAppearanceRawFromSettingsAndLayout(
        obj.settings,
        layoutJson
      );
      applyAppearanceFieldsToForm(mergeAppearanceFromSaved(appearanceRaw));
      saveAdvancedAppearanceToLocalStorage();

      const plotDiv = document.getElementById("chart-container");
      if (!plotDiv) return;
      plotDiv.innerHTML = "";
      gsap.fromTo(
        plotDiv,
        { opacity: 0, y: 0 },
        { opacity: 1, y: 0, duration: 0.5, ease: "bounce.out" }
      );
      const layoutWithMargins = applyAxisMargins(
        { ...layoutJson, autosize: true, dragmode: "pan" },
        dataJson
      );
      const plotLayout = applyAppearanceToPlotLayout(layoutWithMargins);
      const config = {
        displaylogo: false,
        responsive: true,
        scrollZoom: true,
        modeBarButtonsToRemove: [
          "toImage",
          "zoom2d",
          "lasso2d",
          "select2d",
        ],
        modeBarButtonsToAdd: [],
      };
      Plotly.newPlot(plotDiv, dataJson, plotLayout, config).then(() =>
        Plotly.Plots.resize(plotDiv)
      );

      currentChartType = chartType;
      saveGraphToLocalStorage(
        dataJson,
        layoutJson,
        obj.columns || [],
        obj.previewHtml || ""
      );
      applySavedChartContext(obj);
    })
    .catch((err) => console.error("Не удалось загрузить график:", err));
}
