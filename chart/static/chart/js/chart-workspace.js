/* Charthaven: вкладки, загрузка, Plotly, настройки графика, localStorage. */
/** Текущая тема интерфейса (как в theme.js / data-theme на <html>). */
function chartExportIsDarkTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

/**
 * Подмена фона и подписей в layout Plotly при экспорте (PNG/SVG/JPEG).
 * Фон бумаги/области графика — как в настройках (chart-bg-color), для светлой и тёмной темы.
 * Если цвет не задан, PNG/SVG — прозрачный фон; JPEG — фон по теме интерфейса.
 */
function applyChartExportTheme(layout, exportFormat) {
  if (!layout || typeof layout !== "object") return layout;
  const transparentBg =
    exportFormat === "png" || exportFormat === "svg";
  const dark = chartExportIsDarkTheme();
  const userBg = getChartBackgroundColorFromAppearance();
  const labelColor = getChartFontColorFromAppearance();
  const labelFamily = getChartFontFamilyFromAppearance();
  const C = dark
    ? {
        paper: "#1a2332",
        plot: "#1a2332",
        grid: "rgba(255, 255, 255, 0.28)",
        axis: "#ffffff",
        zeroline: "rgba(255, 255, 255, 0.45)",
        legendBg: "rgba(26, 35, 50, 0.94)",
      }
    : {
        paper: "#ffffff",
        plot: "#ffffff",
        grid: "rgba(0, 0, 0, 0.22)",
        axis: "#000000",
        zeroline: "rgba(0, 0, 0, 0.35)",
        legendBg: "rgba(255, 255, 255, 0.94)",
      };

  const out = { ...layout };
  if (userBg) {
    out.paper_bgcolor = userBg;
    out.plot_bgcolor = userBg;
  } else if (transparentBg) {
    out.paper_bgcolor = "rgba(0,0,0,0)";
    out.plot_bgcolor = "rgba(0,0,0,0)";
  } else {
    out.paper_bgcolor = C.paper;
    out.plot_bgcolor = C.plot;
  }
  out.font = {
    ...(out.font || {}),
    color: labelColor,
    family: labelFamily,
  };
  if (out.title && typeof out.title === "object") {
    out.title = {
      ...out.title,
      font: {
        ...(out.title.font || {}),
        color: labelColor,
        family: labelFamily,
      },
    };
  }
  if (out.legend && typeof out.legend === "object") {
    const legendTransparent =
      transparentBg && !userBg;
    out.legend = {
      ...out.legend,
      font: {
        ...(out.legend.font || {}),
        color: labelColor,
        family: labelFamily,
      },
      bgcolor: legendTransparent
        ? "rgba(0,0,0,0)"
        : out.paper_bgcolor || C.legendBg,
    };
  }

  function patchAxis(ax) {
    if (!ax || typeof ax !== "object") return ax;
    const a = { ...ax };
    a.tickfont = {
      ...(a.tickfont || {}),
      color: labelColor,
      family: labelFamily,
    };
    a.gridcolor = C.grid;
    a.zerolinecolor = C.zeroline;
    a.linecolor = C.axis;
    if (typeof a.title === "string") {
      a.title = {
        text: a.title,
        font: { color: labelColor, family: labelFamily },
      };
    } else if (a.title && typeof a.title === "object") {
      a.title = {
        ...a.title,
        font: {
          ...(a.title.font || {}),
          color: labelColor,
          family: labelFamily,
        },
      };
    }
    return a;
  }

  Object.keys(out).forEach(function (k) {
    if (k.startsWith("xaxis") || k.startsWith("yaxis")) {
      out[k] = patchAxis(out[k]);
    }
  });

  if (out.colorbar && typeof out.colorbar === "object") {
    const cb = { ...out.colorbar };
    cb.tickfont = {
      ...(cb.tickfont || {}),
      color: labelColor,
      family: labelFamily,
    };
    if (typeof cb.title === "string") {
      cb.title = { text: cb.title, font: { color: labelColor, family: labelFamily } };
    } else if (cb.title && typeof cb.title === "object") {
      cb.title = {
        ...cb.title,
        font: {
          ...(cb.title.font || {}),
          color: labelColor,
          family: labelFamily,
        },
      };
    }
    out.colorbar = cb;
  }

  return out;
}

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.querySelector(".file-input");

  fileInput.addEventListener("dragenter", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.classList.add("dragging");
  });

  fileInput.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  fileInput.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.classList.remove("dragging");
  });

  fileInput.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.classList.remove("dragging");
    const files = e.dataTransfer.files;
    if (files.length) {
      fileInput.files = files; // Привязка перетаскиваемого файла к input
    }
  });
});

// Боковая панель (вкладки и контент)
const tabs = document.querySelectorAll(".tab-item");
const tabContents = document.querySelectorAll(".tab-content");

/** Переключить боковую вкладку по data-tab (tab-1 … tab-4). */
function activateTabById(tabId) {
  const tab = document.querySelector(`.tab-item[data-tab="${tabId}"]`);
  const target = document.getElementById(tabId);
  if (!tab || !target) return false;
  if (tab.classList.contains("disabled")) return false;
  tabs.forEach((t) => t.classList.remove("active"));
  tabContents.forEach((c) => c.classList.remove("active"));
  tab.classList.add("active");
  target.classList.add("active");
  gsap.fromTo(
    target,
    { opacity: 0, y: 50 },
    { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
  );
  localStorage.setItem("activeTab", tabId);
  return true;
}

// Добавляем обработчик событий на все вкладки
tabs.forEach((tab) => {
  tab.addEventListener("click", (e) => {
    e.preventDefault();
    if (tab.classList.contains("disabled")) return;

    gsap.to(tab, {
      scale: 0.99,
      duration: 0.2,
      ease: "power1.inOut",
      onComplete: () => {
        gsap.to(tab, {
          scale: 1,
          duration: 0.2,
          ease: "power1.out",
        });
      },
    });

    activateTabById(tab.dataset.tab);
  });
});

let availableColumns = []; // Глобальная переменная для хранения загруженных столбцов
let currentChartType = null; // Глобальная переменная для текущего выбранного типа графика

/**
 * Ключи localStorage с данными графика и файла (не привязаны к сессии Django).
 * chart-theme не трогаем — предпочтение светлой/тёмной темы интерфейса.
 */
const CHART_WORKSPACE_LOCALSTORAGE_KEYS = [
  "uploadedFileId",
  "uploadedFileName",
  "fileUploaded",
  "chartPreview",
  "chartColumns",
  "chartGraph",
  "chartLayout",
  "chartSettings",
  "chartAppearance",
  "pieChartColors",
  "activeTab",
];

function clearChartWorkspaceLocalStorage() {
  try {
    CHART_WORKSPACE_LOCALSTORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    /* ignore */
  }
}

/** Имя колонки из списка или первый столбец (если preferred не из этого файла). */
function pickColumn(columns, preferred) {
  if (!Array.isArray(columns) || columns.length === 0) {
    return preferred != null ? String(preferred) : "";
  }
  const p = preferred != null ? String(preferred) : "";
  return columns.includes(p) ? p : columns[0];
}

/** Пара осей X/Y: оба имени должны быть из columns; для Y при необходимости — другой столбец, не X. */
function pickAxisPair(columns, xPref, yPref) {
  const x = pickColumn(columns, xPref);
  let y = pickColumn(columns, yPref);
  if (y === x && columns.length > 1) {
    const alt = columns.find((c) => c !== x);
    if (alt) y = alt;
  }
  return { x, y };
}

/** Должен совпадать с data-type карточек и с обработчиком на сервере */
const CHART_TYPES = ["line", "bar", "pie", "hist", "scatter", "area"];

const CHART_DEBOUNCE_MS = 350;
let chartPreviewTimer = null;
let chartFetchAbort = null;
let chartResizeBound = false;

function buildChartPayload() {
  const chartType = (
    document.getElementById("chart-type").value || ""
  ).trim();
  if (!chartType || !CHART_TYPES.includes(chartType)) return null;
  const uploadedFileId = localStorage.getItem("uploadedFileId");
  if (!uploadedFileId) return null;

  const titleInput = document.getElementById(`${chartType}-title`);
  const chartData = {
    chartType,
    chartTitle: (titleInput && titleInput.value)
      ? titleInput.value.trim()
      : "Без названия",
    uploadedFileId,
  };

  if (
    chartType === "line" ||
    chartType === "bar" ||
    chartType === "scatter" ||
    chartType === "area"
  ) {
    chartData.xLabel =
      document.getElementById(`${chartType}-x-axis-label`).value || "";
    chartData.yLabel =
      document.getElementById(`${chartType}-y-axis-label`).value || "";
  } else if (chartType === "hist") {
    chartData.xLabel =
      document.getElementById("hist-x-axis-label").value || "";
    chartData.yLabel = "";
  } else {
    chartData.xLabel = "";
    chartData.yLabel = "";
  }

  const cols = availableColumns || [];

  if (chartType === "line") {
    const pair = pickAxisPair(
      cols,
      document.getElementById(`${chartType}-x-axis`)?.value,
      document.getElementById(`${chartType}-y-axis`)?.value
    );
    chartData.xAxis = pair.x;
    chartData.yAxis = pair.y;
    chartData.chartColor =
      document.getElementById(`${chartType}-color`)?.value || "#000000";
    chartData.lineWidth = document.getElementById("line-width")?.value || 2;
    chartData.lineStyle =
      document.getElementById("line-style")?.value || "solid";
  } else if (
    chartType === "bar" ||
    chartType === "scatter" ||
    chartType === "area"
  ) {
    const pair = pickAxisPair(
      cols,
      document.getElementById(`${chartType}-x-axis`)?.value,
      document.getElementById(`${chartType}-y-axis`)?.value
    );
    chartData.xAxis = pair.x;
    chartData.yAxis = pair.y;
    chartData.chartColor =
      document.getElementById(`${chartType}-color`)?.value || "#000000";
  } else if (chartType === "pie") {
    const pair = pickAxisPair(
      cols,
      document.getElementById("pie-x-axis")?.value,
      document.getElementById("pie-y-axis")?.value
    );
    chartData.xAxis = pair.x;
    chartData.yAxis = pair.y;
    const colorInputs = document.querySelectorAll(
      "#pie-custom-colors .input-color"
    );
    chartData.chartColors = Array.from(colorInputs).map((input) => input.value);
  } else if (chartType === "hist") {
    chartData.xAxis = pickColumn(
      cols,
      document.getElementById("hist-x-axis")?.value
    );
    chartData.bins = document.getElementById("hist-bins")?.value || 10;
    chartData.chartColor =
      document.getElementById(`${chartType}-color`)?.value || "#000000";
  } else {
    return null;
  }

  if (
    chartType === "line" ||
    chartType === "bar" ||
    chartType === "scatter" ||
    chartType === "area"
  ) {
    if (!chartData.xAxis || !chartData.yAxis) return null;
  } else if (chartType === "pie") {
    if (!chartData.xAxis || !chartData.yAxis) return null;
  } else if (chartType === "hist") {
    if (!chartData.xAxis) return null;
    if (
      chartData.bins === undefined ||
      chartData.bins === null ||
      chartData.bins === ""
    ) {
      return null;
    }
  } else {
    return null;
  }

  /* Подставить в селекты исправленные оси (если pickColumn заменил несуществующий столбец). */
  if (
    chartType === "line" ||
    chartType === "bar" ||
    chartType === "scatter" ||
    chartType === "area"
  ) {
    const sx = document.getElementById(`${chartType}-x-axis`);
    const sy = document.getElementById(`${chartType}-y-axis`);
    if (sx && chartData.xAxis) sx.value = chartData.xAxis;
    if (sy && chartData.yAxis) sy.value = chartData.yAxis;
  } else if (chartType === "pie") {
    const sx = document.getElementById("pie-x-axis");
    const sy = document.getElementById("pie-y-axis");
    if (sx && chartData.xAxis) sx.value = chartData.xAxis;
    if (sy && chartData.yAxis) sy.value = chartData.yAxis;
  } else if (chartType === "hist") {
    const sx = document.getElementById("hist-x-axis");
    if (sx && chartData.xAxis) sx.value = chartData.xAxis;
  }

  chartData.appearance = collectAppearancePayload();

  return chartData;
}

function showChartError(message) {
  const plotDiv = document.getElementById("chart-container");
  if (!plotDiv) return;
  plotDiv.innerHTML = "";
  const p = document.createElement("p");
  p.className = "chart-error";
  p.textContent = message;
  plotDiv.appendChild(p);
}

function bindChartResizeOnce() {
  if (chartResizeBound) return;
  chartResizeBound = true;
  window.addEventListener("resize", () => {
    const el = document.getElementById("chart-container");
    if (el && el.layout) Plotly.Plots.resize(el);
  });
}

/** Запас под подписи осей на разных экранах + automargin для длинных подписей */
function applyAxisMargins(layout, graphData) {
  const out = layout && typeof layout === "object" ? { ...layout } : {};
  out.title = "";
  const m = out.margin || {};
  out.margin = {
    l: Math.max(Number(m.l) || 0, 64),
    r: Math.max(Number(m.r) || 0, 36),
    t: Math.max(Number(m.t) || 0, 28),
    b: Math.max(Number(m.b) || 0, 80),
    pad: typeof m.pad === "number" ? m.pad : 4,
  };
  if (out.xaxis && typeof out.xaxis === "object") {
    out.xaxis = { ...out.xaxis, automargin: true };
  }
  if (out.yaxis && typeof out.yaxis === "object") {
    out.yaxis = { ...out.yaxis, automargin: true };
  }
  if (graphData && graphData[0] && graphData[0].type === "pie") {
    out.margin.l = Math.max(out.margin.l, 20);
    out.margin.r = Math.max(out.margin.r, 20);
    out.margin.b = Math.max(out.margin.b, 20);
  }
  return out;
}

function renderPlotlyChart(data, chartTitle) {
  const plotDiv = document.getElementById("chart-container");
  plotDiv.innerHTML = "";
  const chartTitleHeader = document.getElementById("chart-title-header");
  chartTitleHeader.textContent = chartTitle;

  gsap.fromTo(
    plotDiv,
    { opacity: 0, y: 0 },
    { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
  );

  const layoutWithMargins = applyAxisMargins(
    { ...data.layout, dragmode: "pan", autosize: true },
    data.graphData
  );
  const layout = applyAppearanceToPlotLayout(layoutWithMargins);

  const config = {
    displaylogo: false,
    responsive: true,
    scrollZoom: true,
    displayModeBar: true,
    modeBarButtonsToRemove: [
      "toImage",
      "zoom2d",
      "lasso2d",
      "select2d",
    ],
    modeBarButtonsToAdd: [],
  };

  Plotly.newPlot(plotDiv, data.graphData, layout, config);

  bindChartResizeOnce();
}

function executeChartFetch(chartData) {
  if (chartFetchAbort) chartFetchAbort.abort();
  chartFetchAbort = new AbortController();

  const hdr = {
    "Content-Type": "application/json",
  };
  const csrf = getCsrfToken();
  if (csrf) hdr["X-CSRFToken"] = csrf;

  fetch("/create_chart/", {
    method: "POST",
    headers: hdr,
    credentials: "same-origin",
    body: JSON.stringify(chartData),
    signal: chartFetchAbort.signal,
  })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        const msg = data.error || "Ошибка сервера";
        if (chartData.saveToLibrary) alert(msg);
        else showChartError(msg);
        return null;
      }
      return data;
    })
    .then((data) => {
      if (!data) return;
      if (data.error) {
        if (chartData.saveToLibrary) alert(data.error);
        else showChartError(data.error);
        return;
      }
      const preview = document.getElementById("data-preview");
      renderPlotlyChart(data, chartData.chartTitle);
      currentChartType = chartData.chartType;
      saveGraphToLocalStorage(
        data.graphData,
        data.layout,
        availableColumns,
        preview ? preview.innerHTML : ""
      );
      saveSettingsToLocalStorage();
      saveAdvancedAppearanceToLocalStorage();
      if (chartData.saveToLibrary) {
        showCustomAlert("График сохранён в «Созданные графики».");
      }
    })
    .catch((error) => {
      if (error.name === "AbortError") return;
      console.error("Ошибка при создании графика:", error);
      if (chartData.saveToLibrary) {
        alert("Произошла ошибка при сохранении графика.");
      }
    });
}

function runChartPreviewRequest() {
  const chartData = buildChartPayload();
  if (!chartData) return;
  chartData.saveToLibrary = false;
  executeChartFetch(chartData);
}

function scheduleChartUpdate(immediate) {
  clearTimeout(chartPreviewTimer);
  if (immediate) {
    chartPreviewTimer = null;
    runChartPreviewRequest();
    return;
  }
  chartPreviewTimer = setTimeout(() => {
    chartPreviewTimer = null;
    runChartPreviewRequest();
  }, CHART_DEBOUNCE_MS);
}

// Функция для обновления выпадающих списков осей
function updateAxisOptions(columns, chartType) {
  const xAxisSelect = document.getElementById(`${chartType}-x-axis`);
  const yAxisSelect = document.getElementById(`${chartType}-y-axis`);

  if (!xAxisSelect) {
    console.error(`Элемент для X-оси не найден для графика типа: ${chartType}`);
    return;
  }
  if (chartType !== "hist" && !yAxisSelect) {
    // Y-ось обязательна только для типов, отличных от гистограммы
    console.error(`Элемент для Y-оси не найден для графика типа: ${chartType}`);
    return;
  }
  // Очистка старых значений
  xAxisSelect.innerHTML = "";
  if (yAxisSelect) {
    yAxisSelect.innerHTML = ""; // Очистка Y-оси, если она существует
  }

  if (columns && columns.length > 0) {
    // Заполняем список значений для X-оси
    columns.forEach((col) => {
      const optionX = document.createElement("option");
      optionX.value = col;
      optionX.innerText = col;
      xAxisSelect.appendChild(optionX);

      // Если Y-ось есть (например, для линейного графика)
      if (yAxisSelect) {
        const optionY = document.createElement("option");
        optionY.value = col;
        optionY.innerText = col;
        yAxisSelect.appendChild(optionY);
      }
    });
  } else {
    alert("Нет доступных столбцов для осей.");
  }
}

const chartSettings = document.querySelectorAll(".chart-settings");

// Переключение настроек для различных типов графиков
document.addEventListener("DOMContentLoaded", () => {
  const chartCards = document.querySelectorAll(".chart-card");
  const chartTypeInput = document.getElementById("chart-type");

  chartCards.forEach((card) => {
    card.addEventListener("click", () => {
      if (currentChartType && CHART_TYPES.includes(currentChartType)) {
        saveSettingsToLocalStorage();
      }

      chartCards.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");

      currentChartType = card.getAttribute("data-type");

      chartSettings.forEach((settings) => settings.classList.add("hidden"));

      const targetSettings = document.getElementById(
        `${currentChartType}-chart-settings`
      );
      if (targetSettings) {
        targetSettings.classList.remove("hidden");
      }
      gsap.fromTo(
        targetSettings,
        { opacity: 0, y: 100 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );

      if (chartTypeInput) {
        chartTypeInput.value = currentChartType;
      }

      if (availableColumns.length > 0) {
        updateAxisOptions(availableColumns, currentChartType);
        applyCachedSettingsForType(currentChartType);
        scheduleChartUpdate(true);
      } else {
        console.error("Столбцы для осей не загружены.");
      }
    });
  });
});

// Динамическое обновление данных с помощью AJAX (только главная с формой загрузки)
const uploadFormEl = document.getElementById("upload-form");
if (uploadFormEl) {
  uploadFormEl.addEventListener("submit", function (e) {
  e.preventDefault(); // Останавливаем стандартную отправку формы

  let formData = new FormData(uploadFormEl); // Получаем данные из формы

  const errorMessageEl = document.getElementById("error-message");
  const dataPreviewEl = document.getElementById("data-preview");
  if (errorMessageEl) {
    errorMessageEl.style.display = "none";
    errorMessageEl.classList.remove("show");
    errorMessageEl.innerText = "";
  }

  // Показываем прогресс-бар
  document.getElementById("progress-container").style.display = "block";
  const progressBar = document.getElementById("progress-bar");

  // Создаем объект XMLHttpRequest для отслеживания прогресса
  const xhr = new XMLHttpRequest();

  xhr.open("POST", "/upload/", true);
  const csrf = getCsrfToken();
  if (csrf) xhr.setRequestHeader("X-CSRFToken", csrf);

  // Обработчик прогресса загрузки
  xhr.upload.addEventListener("progress", function (e) {
    if (e.lengthComputable) {
      const percent = (e.loaded / e.total) * 100;
      gsap.to(progressBar, {
        value: percent,
        duration: 0.2,
        ease: "power1.out",
      });
    }
  });

  // Когда загрузка завершена
  xhr.onload = function () {
    let data = {};
    try {
      data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
    } catch (err) {
      data = {};
    }

    if (xhr.status === 200 && !data.error) {
      localStorage.setItem("uploadedFileId", data.uploadedFileId);
      localStorage.setItem("uploadedFileName", data.uploadedFileName);
      localStorage.setItem("fileUploaded", "true");
      localStorage.setItem("chartPreview", data.preview_data);
      localStorage.setItem("chartColumns", JSON.stringify(data.columns));

      // Очистка старых данных
      availableColumns = []; // Сброс доступных столбцов
      currentChartType = null;

      clearChartSurfaceAndStoredGraph();

      // Если данные успешно загружены, отображаем их
      document.getElementById("data-preview").innerHTML = data.preview_data;
      document.getElementById("data-preview").style.display = "block";
      document.getElementById("error-message").style.display = "none"; // Прячем ошибку
      document.getElementById("data-preview").classList.add("show");
        // Плавная анимация для таблицы предварительного просмотра
      gsap.fromTo(
        document.getElementById("data-preview"),
        { opacity: 1, y: 50 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );
      // Обновляем вкладки при успешной загрузке
      const tabs = document.querySelectorAll(".tab-item");
      tabs.forEach((tab) => {
        if (tab.dataset.tab === "tab-2" || tab.dataset.tab == "tab-3") {
          // Разблокируем вкладки "Настройки графиков" и "Созданные графики"
          tab.classList.remove("disabled");
        }
      });
      // Извлекаем столбцы для осей
      if (data.columns) {
        availableColumns = data.columns;
      } else {
        document.getElementById("error-message").innerText =
          "Не удалось получить столбцы из данных.";
        document.getElementById("error-message").style.display = "block";
      }
      // Показываем кнопку для удаления файла после успешной загрузки
      const deleteButton = document.getElementById("delete-file-btn");
      deleteButton.style.display = "inline-block";

      try {
        localStorage.removeItem("chartSettings");
      } catch (e) {
        /* ignore */
      }

      // Сбросить настройки графика
      // Очистить отображение настроек графика и вернуться к выбору типа графика
      chartSettings.forEach((settings) => settings.classList.add("hidden"));
      const chartCards = document.querySelectorAll(".chart-card");
      chartCards.forEach((card) => card.classList.remove("active"));
      currentChartType = null;

      // Сбросить цвета
      const colorInputs = document.querySelectorAll("input[type='color']");
      colorInputs.forEach((input) => (input.value = input.defaultValue));

      // Сбросить все текстовые поля
      const textInputs = document.querySelectorAll("input[type='text']");
      textInputs.forEach((input) => (input.value = ""));

      // Сбросить числовые поля
      const numberInputs = document.querySelectorAll("input[type='number']");
      numberInputs.forEach((input) => (input.value = input.min));

      // Сбросить выпадающие списки стилей линий
      const lineStyleSelects = document.querySelectorAll(
        "select[id*='-style']"
      );
      lineStyleSelects.forEach((select) => (select.value = "solid"));

      // Сбросить толщину линии для линейного графика
      const lineWidthInput = document.getElementById("line-width");
      if (lineWidthInput) {
        lineWidthInput.value = 2; // Сбросим толщину линии в 2 по умолчанию
        document.getElementById("line-width-value").textContent = "2"; // Обновим отображение
      }
    } else {
      const serverError =
        data.error ||
        (xhr.status >= 500
          ? "Внутренняя ошибка сервера при обработке файла."
          : "Не удалось загрузить файл. Проверьте формат и структуру данных.");
      if (errorMessageEl) {
        errorMessageEl.innerText = serverError;
        errorMessageEl.style.display = "block";
        errorMessageEl.classList.add("show");
      }
      if (dataPreviewEl) {
        dataPreviewEl.style.display = "none";
        dataPreviewEl.innerHTML = "";
      }
    }
    // Скрываем прогресс-бар после завершения загрузки
    document.getElementById("progress-container").style.display = "none";

  };

  // Обработчик ошибок
  xhr.onerror = function () {
    document.getElementById("error-message").innerText =
      "Произошла ошибка при загрузке данных.";
    document.getElementById("error-message").style.display = "block"; // Показываем ошибку
    document.getElementById("data-preview").style.display = "none"; // Прячем данные
    document.getElementById("error-message").classList.add("show"); // Добавляем анимацию
  };

  // Отправляем запрос с данными
  xhr.send(formData);
});
}

// Добавление и удаление цветов в круговой диаграмме
document.addEventListener("DOMContentLoaded", function () {
  const pieColorContainer = document.getElementById("pie-custom-colors");
  const addColorButton = document.getElementById("add-color");
  const deleteColorButton = document.getElementById("delete-color");
  if (!pieColorContainer || !addColorButton || !deleteColorButton) return;

  // Функция для сохранения текущих цветов в localStorage
  function savePieColorsToLocalStorage() {
    const colorInputs = pieColorContainer.querySelectorAll(".input-color");
    const colors = Array.from(colorInputs).map((input) => input.value);
    localStorage.setItem("pieChartColors", JSON.stringify(colors));
  }

  // Добавление нового цвета
  addColorButton.addEventListener("click", () => {
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.className = "input-color";
    colorInput.value = "#000000"; // Цвет по умолчанию

    // Сохраняем каждый раз при изменении цвета
    colorInput.addEventListener("input", savePieColorsToLocalStorage);

    gsap.fromTo(
      pieColorContainer.insertBefore(colorInput, addColorButton.parentElement),
      { opacity: 0, y: 10 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out",
        onComplete: () => {
          savePieColorsToLocalStorage();
          scheduleChartUpdate(true);
        },
      }
    );
  });

  // Удаление последнего цвета
  deleteColorButton.addEventListener("click", () => {
    const colorInputs = pieColorContainer.querySelectorAll(".input-color");
    if (colorInputs.length > 1) {
      const lastColorInput = colorInputs[colorInputs.length - 1];

      gsap.to(lastColorInput, {
        opacity: 0,
        y: 10,
        duration: 0.3,
        ease: "power2.out",
        onComplete: () => {
          lastColorInput.remove();
          savePieColorsToLocalStorage();
          scheduleChartUpdate(true);
        },
      });
    }
  });

  // 🔁 Восстановление цветов при загрузке страницы
  const savedColors = JSON.parse(localStorage.getItem("pieChartColors") || "[]");
  if (savedColors.length > 0) {
    savedColors.forEach((color) => {
      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.className = "input-color";
      colorInput.value = color;
      colorInput.addEventListener("input", savePieColorsToLocalStorage);
      pieColorContainer.insertBefore(colorInput, addColorButton.parentElement);
    });
  }
});


// Сохранить график в коллекцию (запись в БД) — только на главной
const saveChartBtn = document.getElementById("save-chart-btn");
if (saveChartBtn) {
  saveChartBtn.addEventListener("click", function () {
    if (typeof window.isAuthenticated !== "undefined" && !window.isAuthenticated) {
      showCustomAlert("Пожалуйста, войдите в аккаунт, чтобы сохранять графики.");
      return;
    }
    const chartData = buildChartPayload();
    if (!chartData) {
      showCustomAlert(
        "Перед сохранением выберите тип графика, загрузите файл и заполните оси (и корзины для гистограммы)."
      );
      return;
    }
    chartData.saveToLibrary = true;
    executeChartFetch(chartData);
  });
}

// Автоперестроение при изменении настроек (debounce внутри scheduleChartUpdate)
const tab2El = document.getElementById("tab-2");
if (tab2El) {
  tab2El.addEventListener(
    "input",
    () => scheduleChartUpdate(),
    true
  );
  tab2El.addEventListener(
    "change",
    () => scheduleChartUpdate(),
    true
  );
}

// Кнопка "Удалить файл"
document.addEventListener("DOMContentLoaded", function () {
  const deleteFileBtn = document.getElementById("delete-file-btn");
  const deleteModal = document.getElementById("deleteModal");
  const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
  const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
  if (!deleteFileBtn || !deleteModal || !confirmDeleteBtn || !cancelDeleteBtn) {
    return;
  }

  // Показ модального окна
  deleteFileBtn.addEventListener("click", () => {
    deleteModal.classList.add("show");
  });

  cancelDeleteBtn.addEventListener("click", () => {
    deleteModal.classList.remove("show");
  });

  // Удаление данных при подтверждении
  confirmDeleteBtn.addEventListener("click", () => {
    // Очистка данных
    // Очистка данных
    availableColumns = []; // Сброс доступных столбцов
    const dataPreview = document.getElementById("data-preview");
    deleteFileBtn.style.display = "none";
    document.getElementById("error-message").style.display = "none";

    gsap.to(dataPreview, {
      opacity: 0,
      y: -50,
      duration: 0.1,
      ease: "power2.in",
      onComplete: () => {
        dataPreview.innerHTML = "";
        dataPreview.style.display = "none";
        localStorage.clear();
        location.reload();
      },
    });

    // Очистка графика
    const plotDiv = document.getElementById("chart-container");
    // plotDiv.innerHTML = "";

    gsap.to(plotDiv, {
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => {
        plotDiv.innerHTML = "";
      },
    });

    const chartTitleHeader = document.getElementById("chart-title-header");
    chartTitleHeader.textContent = "";

    // Сброс формы
    document.getElementById("upload-form").reset();

    // Обновление состояния вкладок
    const tabs = document.querySelectorAll(".tab-item");
    tabs.forEach((tab) => {
      if (tab.dataset.tab === "tab-2") {
        tab.classList.add("disabled");
      } else if (tab.dataset.tab === "tab-1") {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });

    // Активируем контент вкладки "Загрузка данных"
    const tabContents = document.querySelectorAll(".tab-content");
    tabContents.forEach((content) => content.classList.remove("active"));
    document.querySelector("#tab-1").classList.add("active");

    // Закрытие модального окна
    deleteModal.classList.remove("show");
  });

  // Закрытие модального окна при клике вне его
  window.addEventListener("click", (event) => {
    if (event.target === deleteModal) {
      deleteModal.classList.remove("show");
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const deleteSavedChartModal = document.getElementById("deleteSavedChartModal");
  const confirmDeleteSavedBtn = document.getElementById(
    "confirm-delete-saved-chart-btn"
  );
  const cancelDeleteSavedBtn = document.getElementById(
    "cancel-delete-saved-chart-btn"
  );
  if (!deleteSavedChartModal || !confirmDeleteSavedBtn || !cancelDeleteSavedBtn)
    return;

  function closeDeleteSavedChartModal() {
    deleteSavedChartModal.classList.remove("show");
    pendingDeleteSavedChartId = null;
  }

  cancelDeleteSavedBtn.addEventListener("click", closeDeleteSavedChartModal);

  confirmDeleteSavedBtn.addEventListener("click", () => {
    const id = pendingDeleteSavedChartId;
    deleteSavedChartModal.classList.remove("show");
    pendingDeleteSavedChartId = null;
    if (id == null) return;
    executeDeleteSavedChartRequest(id);
  });

  window.addEventListener("click", (event) => {
    if (event.target === deleteSavedChartModal) closeDeleteSavedChartModal();
  });
});

// Скачать график (PNG / SVG / JPEG) — только на главной
const chartDownloadBtn = document.getElementById("chart-download-btn");
if (chartDownloadBtn) {
  chartDownloadBtn.addEventListener("click", function () {
    const plotDiv = document.getElementById("chart-container");
    if (!plotDiv || !plotDiv.data || plotDiv.data.length === 0) {
      showCustomAlert(
        "График не отображён. Сначала загрузите данные и дождитесь построения графика."
      );
      return;
    }
    const formatSelect = document.getElementById("chart-download-format");
    const format = (formatSelect && formatSelect.value) || "png";
    if (!["png", "svg", "jpeg"].includes(format)) {
      return;
    }

    const chartTitle =
      document.getElementById("chart-title-header").textContent.trim() || "chart";

    const originalLayout = JSON.parse(JSON.stringify(plotDiv.layout || {}));
    const m0 = originalLayout.margin || {};
    const prevT = Math.max(Number(m0.t) || 0, 28);
    const showLegend =
      document.getElementById("chart-show-legend") &&
      document.getElementById("chart-show-legend").checked;
    const legendPos =
      (document.getElementById("chart-legend-position") || {}).value || "right";
    /* На экране заголовок в шапке; при скачивании добавляем title в layout — нужен отступ.
       Легенда сверху (orientation h, y≈1.02) занимает полосу под тем же верхом — без extra margin.t они наезжают друг на друга. */
    let titleExtraTop = 52;
    if (showLegend && legendPos === "top") {
      titleExtraTop = 100;
    }

    const layoutWithTitle = applyChartExportTheme(
      {
        ...originalLayout,
        title: {
          text: chartTitle,
          font: {
            size: 16,
          },
          x: 0.5,
          xanchor: "center",
        },
        margin: {
          ...m0,
          l: Math.max(Number(m0.l) || 0, 64),
          r: Math.max(Number(m0.r) || 0, 36),
          t: prevT + titleExtraTop,
          b: Math.max(Number(m0.b) || 0, 80),
          pad: typeof m0.pad === "number" ? m0.pad : 4,
        },
      },
      format
    );

    Plotly.relayout(plotDiv, layoutWithTitle)
      .then(() => {
        const { width, height } = plotDiv.getBoundingClientRect();
        const w = Math.max(1, Math.round(width));
        const h = Math.max(1, Math.round(height));

        /* С выбранным цветом фона — opaque, чтобы в файле совпадало с экраном. */
        const userBg = getChartBackgroundColorFromAppearance();
        return Plotly.downloadImage(plotDiv, {
          format: format,
          width: w,
          height: h,
          filename: chartTitle.replace(/[<>:"/\\|?*]/g, "_"),
          setBackground:
            userBg ||
            format === "jpeg" ||
            format === "jpg"
              ? "opaque"
              : "transparent",
        });
      })
      .catch((err) => {
        console.error(err);
        showCustomAlert(
          "Не удалось сформировать файл. Попробуйте другой формат или обновите страницу."
        );
      })
      .finally(() => {
        Plotly.relayout(plotDiv, originalLayout);
      });
  });
}


function saveSettingsToLocalStorage() {
  if (!currentChartType) return;

  const allSettings = JSON.parse(localStorage.getItem("chartSettings") || "{}");
  const t = currentChartType;
  let settings = {};

  if (t === "line") {
    settings = {
      chartTitle: document.getElementById("line-title")?.value ?? "",
      xAxis: document.getElementById("line-x-axis")?.value ?? "",
      yAxis: document.getElementById("line-y-axis")?.value ?? "",
      xLabel: document.getElementById("line-x-axis-label")?.value ?? "",
      yLabel: document.getElementById("line-y-axis-label")?.value ?? "",
      color: document.getElementById("line-color")?.value ?? "",
      lineWidth: document.getElementById("line-width")?.value ?? 2,
      lineStyle: document.getElementById("line-style")?.value ?? "solid",
    };
  } else if (t === "bar" || t === "scatter" || t === "area") {
    settings = {
      chartTitle: document.getElementById(`${t}-title`)?.value ?? "",
      xAxis: document.getElementById(`${t}-x-axis`)?.value ?? "",
      yAxis: document.getElementById(`${t}-y-axis`)?.value ?? "",
      xLabel: document.getElementById(`${t}-x-axis-label`)?.value ?? "",
      yLabel: document.getElementById(`${t}-y-axis-label`)?.value ?? "",
      color: document.getElementById(`${t}-color`)?.value ?? "",
    };
  } else if (t === "pie") {
    const colorInputs = document.querySelectorAll(
      "#pie-custom-colors .input-color"
    );
    settings = {
      chartTitle: document.getElementById("pie-title")?.value ?? "",
      xAxis: document.getElementById("pie-x-axis")?.value ?? "",
      yAxis: document.getElementById("pie-y-axis")?.value ?? "",
      chartColors: Array.from(colorInputs).map((input) => input.value),
    };
  } else if (t === "hist") {
    settings = {
      chartTitle: document.getElementById("hist-title")?.value ?? "",
      xAxis: document.getElementById("hist-x-axis")?.value ?? "",
      xLabel: document.getElementById("hist-x-axis-label")?.value ?? "",
      yLabel: "",
      color: document.getElementById("hist-color")?.value ?? "",
      bins: document.getElementById("hist-bins")?.value ?? 10,
    };
  }

  allSettings[t] = settings;
  allSettings.lastType = t;
  localStorage.setItem("chartSettings", JSON.stringify(allSettings));
}

/** Фон графика: как у Plotly по умолчанию (светлая тема) и как в theme.css для тёмной */
const CHART_BG_DEFAULT_LIGHT = "#ffffff";
const CHART_BG_DEFAULT_DARK = "#1a2332";

/** Цвет подписей по умолчанию под светлую / тёмную тему интерфейса */
const CHART_FONT_DEFAULT_LIGHT = "#333333";
const CHART_FONT_DEFAULT_DARK = "#e6edf3";

function getDefaultChartBackgroundColor() {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? CHART_BG_DEFAULT_DARK
    : CHART_BG_DEFAULT_LIGHT;
}

function getDefaultChartFontColor() {
  return chartExportIsDarkTheme()
    ? CHART_FONT_DEFAULT_DARK
    : CHART_FONT_DEFAULT_LIGHT;
}

/** Значения по умолчанию совпадают с полями в разметке доп. настроек */
const DEFAULT_CHART_APPEARANCE = {
  fontFamily: "Arial, sans-serif",
  fontColor: "#333333",
  backgroundColor: CHART_BG_DEFAULT_LIGHT,
  showGrid: true,
  showLegend: true,
  legendPosition: "right",
};

/**
 * Доп. настройки для запроса /create_chart/ и сохранения в БД.
 * Всегда возвращает полный объект — иначе при сохранении графика в коллекцию
 * в settings_json не попадали бы шрифт, сетка и легенда.
 */
function collectAppearancePayload() {
  const ff = document.getElementById("chart-font-family");
  const fc = document.getElementById("chart-font-color");
  const bg = document.getElementById("chart-bg-color");
  const sg = document.getElementById("chart-show-grid");
  const sl = document.getElementById("chart-show-legend");
  const lp = document.getElementById("chart-legend-position");
  const out = { ...DEFAULT_CHART_APPEARANCE };
  if (ff) out.fontFamily = ff.value || DEFAULT_CHART_APPEARANCE.fontFamily;
  if (fc) out.fontColor = fc.value;
  if (bg) out.backgroundColor = bg.value;
  if (sg) out.showGrid = sg.checked;
  if (sl) out.showLegend = sl.checked;
  if (lp) out.legendPosition = lp.value;
  return out;
}

function saveAdvancedAppearanceToLocalStorage() {
  try {
    localStorage.setItem(
      "chartAppearance",
      JSON.stringify(collectAppearancePayload())
    );
  } catch (e) {
    /* ignore */
  }
}

/** #rrggbb для input[type=color] из hex/rgb/rgba (layout Plotly). */
function normalizeColorForColorInput(val) {
  if (val == null || String(val).trim() === "") return null;
  const s = String(val).trim();
  if (s.startsWith("#")) {
    if (s.length === 7) return s.toLowerCase();
    if (s.length === 4) {
      return (
        "#" +
        s[1] +
        s[1] +
        s[2] +
        s[2] +
        s[3] +
        s[3]
      ).toLowerCase();
    }
    return null;
  }
  const m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    const r = Math.min(255, parseInt(m[1], 10));
    const g = Math.min(255, parseInt(m[2], 10));
    const b = Math.min(255, parseInt(m[3], 10));
    return (
      "#" +
      [r, g, b]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("")
    );
  }
  return null;
}

/** Доп. настройки из сохранённого layout (фактические цвета на графике). */
function extractAppearanceFromLayout(layout) {
  if (!layout || typeof layout !== "object") return {};
  const out = {};
  const pb = layout.paper_bgcolor ?? layout.plot_bgcolor;
  const bgHex = normalizeColorForColorInput(pb);
  if (bgHex) out.backgroundColor = bgHex;

  const font = layout.font;
  if (font && typeof font === "object") {
    if (font.family) out.fontFamily = font.family;
    const fc = normalizeColorForColorInput(font.color);
    if (fc) out.fontColor = fc;
  }
  if (!out.fontColor && layout.xaxis && typeof layout.xaxis === "object") {
    const tf = layout.xaxis.tickfont;
    if (tf && tf.color) {
      const fc = normalizeColorForColorInput(tf.color);
      if (fc) out.fontColor = fc;
    }
  }
  return out;
}

/**
 * settings.appearance из БД + фактические цвета из layoutJson (layout приоритетнее для фона/подписей).
 */
function buildAppearanceRawFromSettingsAndLayout(settings, layoutJson) {
  const saved =
    settings &&
    settings.appearance &&
    typeof settings.appearance === "object"
      ? { ...settings.appearance }
      : {};
  const fromLayout = extractAppearanceFromLayout(layoutJson);
  const merged = { ...saved };
  if (fromLayout.backgroundColor)
    merged.backgroundColor = fromLayout.backgroundColor;
  if (fromLayout.fontColor) merged.fontColor = fromLayout.fontColor;
  if (fromLayout.fontFamily) merged.fontFamily = fromLayout.fontFamily;
  return merged;
}

/** Слияние сохранённого appearance с дефолтами (старые записи без полей). */
function mergeAppearanceFromSaved(app) {
  const base = { ...DEFAULT_CHART_APPEARANCE };
  base.backgroundColor = getDefaultChartBackgroundColor();
  base.fontColor = getDefaultChartFontColor();
  if (!app || typeof app !== "object") return base;
  if (app.fontFamily != null && String(app.fontFamily) !== "")
    base.fontFamily = app.fontFamily;
  if (app.fontColor != null && String(app.fontColor) !== "")
    base.fontColor = app.fontColor;
  if (app.backgroundColor != null && String(app.backgroundColor).trim() !== "")
    base.backgroundColor = app.backgroundColor;
  else base.backgroundColor = getDefaultChartBackgroundColor();
  if (typeof app.showGrid === "boolean") base.showGrid = app.showGrid;
  if (typeof app.showLegend === "boolean") base.showLegend = app.showLegend;
  if (app.legendPosition != null && String(app.legendPosition) !== "")
    base.legendPosition = app.legendPosition;
  return base;
}

function applyAppearanceFieldsToForm(app) {
  if (!app || typeof app !== "object") return;
  const ff = document.getElementById("chart-font-family");
  const fc = document.getElementById("chart-font-color");
  const bg = document.getElementById("chart-bg-color");
  const sg = document.getElementById("chart-show-grid");
  const sl = document.getElementById("chart-show-legend");
  const lp = document.getElementById("chart-legend-position");
  if (ff && app.fontFamily != null && String(app.fontFamily) !== "")
    ff.value = app.fontFamily;
  if (fc && app.fontColor != null && String(app.fontColor) !== "")
    fc.value = app.fontColor;
  if (bg) {
    const bc =
      app.backgroundColor != null && String(app.backgroundColor).trim() !== ""
        ? app.backgroundColor
        : getDefaultChartBackgroundColor();
    bg.value = bc;
  }
  if (sg && typeof app.showGrid === "boolean") sg.checked = app.showGrid;
  if (sl && typeof app.showLegend === "boolean") sl.checked = app.showLegend;
  if (lp && app.legendPosition != null && String(app.legendPosition) !== "")
    lp.value = app.legendPosition;
}

/** Цвет фона графика из доп. настроек: как у шрифта — сначала поле в DOM, затем localStorage. */
function getChartBackgroundColorFromAppearance() {
  const bgInput = document.getElementById("chart-bg-color");
  if (bgInput && String(bgInput.value || "").trim() !== "")
    return bgInput.value;
  try {
    const raw = localStorage.getItem("chartAppearance");
    if (raw) {
      const merged = mergeAppearanceFromSaved(JSON.parse(raw));
      if (
        merged.backgroundColor != null &&
        String(merged.backgroundColor).trim() !== ""
      )
        return merged.backgroundColor;
    }
  } catch (e) {
    /* ignore */
  }
  return null;
}

/** Цвет и семейство шрифта подписей из доп. настроек (поля + chartAppearance). */
function getChartFontColorFromAppearance() {
  const fc = document.getElementById("chart-font-color");
  if (fc && fc.value && String(fc.value).trim() !== "")
    return fc.value;
  try {
    const raw = localStorage.getItem("chartAppearance");
    if (raw) {
      const merged = mergeAppearanceFromSaved(JSON.parse(raw));
      if (merged.fontColor != null && String(merged.fontColor).trim() !== "")
        return merged.fontColor;
    }
  } catch (e) {
    /* ignore */
  }
  return DEFAULT_CHART_APPEARANCE.fontColor;
}

function getChartFontFamilyFromAppearance() {
  const ff = document.getElementById("chart-font-family");
  if (ff && ff.value && String(ff.value).trim() !== "")
    return ff.value;
  try {
    const raw = localStorage.getItem("chartAppearance");
    if (raw) {
      const merged = mergeAppearanceFromSaved(JSON.parse(raw));
      if (merged.fontFamily != null && String(merged.fontFamily).trim() !== "")
        return merged.fontFamily;
    }
  } catch (e) {
    /* ignore */
  }
  return DEFAULT_CHART_APPEARANCE.fontFamily;
}

/**
 * Применить цвет фона из appearance (advanced settings) к layout Plotly.
 * Удаляем layout.template — иначе px/go подставляют фон из шаблона, и relayout не меняет вид.
 */
function applyBackgroundFromAppearance(layout) {
  const baseLayout =
    layout && typeof layout === "object" ? { ...layout } : {};
  delete baseLayout.template;
  const bgColor = getChartBackgroundColorFromAppearance();
  if (!bgColor) return baseLayout;
  baseLayout.paper_bgcolor = bgColor;
  baseLayout.plot_bgcolor = bgColor;
  return baseLayout;
}

/** Палитра осей и сетки по теме интерфейса (как на экране). */
function getInterfaceThemeAxisPalette() {
  const dark = chartExportIsDarkTheme();
  if (dark) {
    return {
      axis: "#ffffff",
      grid: "rgba(255, 255, 255, 0.28)",
      zeroline: "rgba(255, 255, 255, 0.45)",
    };
  }
  return {
    axis: "#000000",
    grid: "rgba(0, 0, 0, 0.22)",
    zeroline: "rgba(0, 0, 0, 0.35)",
  };
}

/** Линии осей и сетка — по теме интерфейса; цвет текста подписей — в applyAppearanceFontsToLayout. */
function applyAxisThemeToLayout(layout) {
  const base = layout && typeof layout === "object" ? { ...layout } : {};
  const P = getInterfaceThemeAxisPalette();

  function patchAxis(ax) {
    if (!ax || typeof ax !== "object") return ax;
    const a = { ...ax };
    a.linecolor = P.axis;
    a.gridcolor = P.grid;
    a.zerolinecolor = P.zeroline;
    return a;
  }

  Object.keys(base).forEach((k) => {
    if (k.startsWith("xaxis") || k.startsWith("yaxis")) {
      base[k] = patchAxis(base[k]);
    }
  });

  return base;
}

/** Шрифт и цвет подписей осей, легенды, layout.font — из доп. настроек (не затираются тёмной темой). */
function applyAppearanceFontsToLayout(layout) {
  const base = layout && typeof layout === "object" ? { ...layout } : {};
  const fColor = getChartFontColorFromAppearance();
  const fFamily = getChartFontFamilyFromAppearance();

  base.font = { ...(base.font || {}), family: fFamily, color: fColor };

  function patchAxisFonts(ax) {
    if (!ax || typeof ax !== "object") return ax;
    const a = { ...ax };
    a.tickfont = { ...(a.tickfont || {}), color: fColor, family: fFamily };
    if (typeof a.title === "string") {
      a.title = {
        text: a.title,
        font: { color: fColor, family: fFamily },
      };
    } else if (a.title && typeof a.title === "object") {
      a.title = {
        ...a.title,
        font: { ...(a.title.font || {}), color: fColor, family: fFamily },
      };
    }
    return a;
  }

  Object.keys(base).forEach((k) => {
    if (k.startsWith("xaxis") || k.startsWith("yaxis")) {
      base[k] = patchAxisFonts(base[k]);
    }
  });

  if (base.colorbar && typeof base.colorbar === "object") {
    const cb = { ...base.colorbar };
    cb.tickfont = { ...(cb.tickfont || {}), color: fColor, family: fFamily };
    if (typeof cb.title === "string") {
      cb.title = { text: cb.title, font: { color: fColor, family: fFamily } };
    } else if (cb.title && typeof cb.title === "object") {
      cb.title = {
        ...cb.title,
        font: { ...(cb.title.font || {}), color: fColor, family: fFamily },
      };
    }
    base.colorbar = cb;
  }

  if (base.legend && typeof base.legend === "object") {
    base.legend = {
      ...base.legend,
      font: { ...(base.legend.font || {}), color: fColor, family: fFamily },
    };
  } else {
    base.legend = { font: { color: fColor, family: fFamily } };
  }

  if (base.title && typeof base.title === "object") {
    base.title = {
      ...base.title,
      font: { ...(base.title.font || {}), color: fColor, family: fFamily },
    };
  } else if (typeof base.title === "string" && base.title !== "") {
    base.title = {
      text: base.title,
      font: { color: fColor, family: fFamily },
    };
  }

  return base;
}

function applyAppearanceToPlotLayout(layout) {
  return applyAppearanceFontsToLayout(
    applyAxisThemeToLayout(applyBackgroundFromAppearance(layout))
  );
}

function buildAxisThemeRelayoutPatch(layout) {
  if (!layout || typeof layout !== "object") return {};
  const P = getInterfaceThemeAxisPalette();
  const update = {};
  Object.keys(layout).forEach((k) => {
    if (!k.startsWith("xaxis") && !k.startsWith("yaxis")) return;
    const ax = layout[k];
    if (!ax || typeof ax !== "object") return;
    update[`${k}.linecolor`] = P.axis;
    update[`${k}.gridcolor`] = P.grid;
    update[`${k}.zerolinecolor`] = P.zeroline;
  });
  return update;
}

/** Relayout: цвет/семейство подписей из доп. настроек. */
function buildAppearanceFontRelayoutPatch(layout) {
  if (!layout || typeof layout !== "object") return {};
  const fColor = getChartFontColorFromAppearance();
  const fFamily = getChartFontFamilyFromAppearance();
  const update = {
    "font.color": fColor,
    "font.family": fFamily,
  };
  Object.keys(layout).forEach((k) => {
    if (!k.startsWith("xaxis") && !k.startsWith("yaxis")) return;
    const ax = layout[k];
    if (!ax || typeof ax !== "object") return;
    update[`${k}.tickfont.color`] = fColor;
    update[`${k}.tickfont.family`] = fFamily;
    if (ax.title && typeof ax.title === "object" && ax.title.text != null) {
      update[`${k}.title.font.color`] = fColor;
      update[`${k}.title.font.family`] = fFamily;
    }
  });
  if (layout.colorbar && typeof layout.colorbar === "object") {
    update["colorbar.tickfont.color"] = fColor;
    update["colorbar.tickfont.family"] = fFamily;
    if (
      layout.colorbar.title &&
      typeof layout.colorbar.title === "object"
    ) {
      update["colorbar.title.font.color"] = fColor;
      update["colorbar.title.font.family"] = fFamily;
    }
  }
  if (layout.showlegend !== false) {
    update["legend.font.color"] = fColor;
    update["legend.font.family"] = fFamily;
  }
  return update;
}

function relayoutAxisThemeIfPresent() {
  const el = document.getElementById("chart-container");
  if (!el || !el.layout) return;
  const patch = buildAxisThemeRelayoutPatch(el.layout);
  if (Object.keys(patch).length === 0) return;
  Plotly.relayout(el, patch);
}

function relayoutAppearanceFontsIfPresent() {
  const el = document.getElementById("chart-container");
  if (!el || !el.layout) return;
  const patch = buildAppearanceFontRelayoutPatch(el.layout);
  if (Object.keys(patch).length === 0) return;
  Plotly.relayout(el, patch);
}

function restoreAdvancedAppearanceFromLocalStorage() {
  try {
    const raw = localStorage.getItem("chartAppearance");
    const parsed = raw ? JSON.parse(raw) : {};
    applyAppearanceFieldsToForm(mergeAppearanceFromSaved(parsed));
  } catch (e) {
    /* ignore */
  }
}

/**
 * Обновить фон графика без шаблона Plotly (template иначе перебивает paper_bgcolor в Plotly 3).
 * relayout/update часто не меняют вид — используем Plotly.react с полным layout.
 */
function relayoutChartBackgroundIfPresent() {
  const el = document.getElementById("chart-container");
  const bg = document.getElementById("chart-bg-color");
  if (!el || !bg || !el.layout) return;
  const c =
    String(bg.value || "").trim() !== ""
      ? bg.value
      : getChartBackgroundColorFromAppearance();
  if (!c) return;

  const finish = () => {
    if (el && el.layout) Plotly.Plots.resize(el);
  };

  let layout;
  try {
    layout = JSON.parse(JSON.stringify(el.layout));
  } catch (e) {
    Plotly.relayout(el, { paper_bgcolor: c, plot_bgcolor: c });
    requestAnimationFrame(finish);
    return;
  }
  delete layout.template;
  layout.paper_bgcolor = c;
  layout.plot_bgcolor = c;

  const data = el.data;
  if (!Array.isArray(data) || data.length === 0) {
    Plotly.relayout(el, { paper_bgcolor: c, plot_bgcolor: c });
    requestAnimationFrame(finish);
    return;
  }

  if (typeof Plotly.react === "function") {
    try {
      const p = Plotly.react(el, data, layout);
      if (p && typeof p.then === "function") p.then(finish);
      else requestAnimationFrame(finish);
    } catch (err) {
      const done = Plotly.relayout(el, { paper_bgcolor: c, plot_bgcolor: c });
      if (done && typeof done.then === "function") done.then(finish);
      else requestAnimationFrame(finish);
    }
    return;
  }

  const done = Plotly.relayout(el, { paper_bgcolor: c, plot_bgcolor: c });
  if (done && typeof done.then === "function") done.then(finish);
  else requestAnimationFrame(finish);
}

function onInterfaceThemeChanged(ev) {
  const next = ev && ev.detail && ev.detail.theme;
  if (next !== "light" && next !== "dark") return;
  const bg = document.getElementById("chart-bg-color");
  const fc = document.getElementById("chart-font-color");
  if (bg) {
    const v = (bg.value || "").toLowerCase();
    if (next === "dark" && v === CHART_BG_DEFAULT_LIGHT.toLowerCase()) {
      bg.value = CHART_BG_DEFAULT_DARK;
    } else if (next === "light" && v === CHART_BG_DEFAULT_DARK.toLowerCase()) {
      bg.value = CHART_BG_DEFAULT_LIGHT;
    }
  }
  if (fc) {
    const fv = (fc.value || "").toLowerCase();
    if (next === "dark" && fv === CHART_FONT_DEFAULT_LIGHT.toLowerCase()) {
      fc.value = CHART_FONT_DEFAULT_DARK;
    } else if (next === "light" && fv === CHART_FONT_DEFAULT_DARK.toLowerCase()) {
      fc.value = CHART_FONT_DEFAULT_LIGHT;
    }
  }
  saveAdvancedAppearanceToLocalStorage();
  relayoutChartBackgroundIfPresent();
  relayoutAxisThemeIfPresent();
  relayoutAppearanceFontsIfPresent();
}

/** Восстановить поля настроек для типа из вложенного chartSettings (после updateAxisOptions). */
function applyCachedSettingsForType(chartType) {
  if (!chartType || !CHART_TYPES.includes(chartType)) return;
  const allSettings = JSON.parse(localStorage.getItem("chartSettings") || "{}");
  const s = allSettings[chartType];
  if (!s || typeof s !== "object") return;

  const setVal = (id, val) => {
    if (val === undefined) return;
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === "SELECT") {
      const opts = Array.from(el.options).map((o) => o.value);
      if (opts.length && !opts.includes(String(val))) return;
    }
    el.value = val;
  };

  if (chartType === "line") {
    setVal("line-title", s.chartTitle);
    setVal("line-x-axis", s.xAxis);
    setVal("line-y-axis", s.yAxis);
    setVal("line-x-axis-label", s.xLabel);
    setVal("line-y-axis-label", s.yLabel);
    setVal("line-color", s.color);
    setVal("line-width", s.lineWidth);
    setVal("line-style", s.lineStyle);
    const lwv = document.getElementById("line-width-value");
    if (lwv && s.lineWidth != null && s.lineWidth !== "")
      lwv.textContent = s.lineWidth;
  } else if (chartType === "bar" || chartType === "scatter" || chartType === "area") {
    setVal(`${chartType}-title`, s.chartTitle);
    setVal(`${chartType}-x-axis`, s.xAxis);
    setVal(`${chartType}-y-axis`, s.yAxis);
    setVal(`${chartType}-x-axis-label`, s.xLabel);
    setVal(`${chartType}-y-axis-label`, s.yLabel);
    setVal(`${chartType}-color`, s.color);
  } else if (chartType === "pie") {
    setVal("pie-title", s.chartTitle);
    setVal("pie-x-axis", s.xAxis);
    setVal("pie-y-axis", s.yAxis);
    if (s.chartColors && s.chartColors.length)
      setPieColorsFromSettings(s.chartColors);
  } else if (chartType === "hist") {
    setVal("hist-title", s.chartTitle);
    setVal("hist-x-axis", s.xAxis);
    setVal("hist-x-axis-label", s.xLabel);
    setVal("hist-bins", s.bins);
    setVal("hist-color", s.color);
  }
}

// Восстановление настроек из localStorage
function restoreSettingsFromLocalStorage() {
  const allSettings = JSON.parse(localStorage.getItem("chartSettings") || "{}");
  const typeRaw = allSettings.lastType;
  if (!typeRaw) return;
  const type = String(typeRaw).trim();
  if (!CHART_TYPES.includes(type)) {
    delete allSettings.lastType;
    try {
      localStorage.setItem("chartSettings", JSON.stringify(allSettings));
    } catch (e) {
      /* ignore */
    }
    return;
  }

  currentChartType = type;
  const chartTypeInput = document.getElementById("chart-type");
  if (chartTypeInput) chartTypeInput.value = currentChartType;

  const chartCards = document.querySelectorAll(".chart-card");
  chartCards.forEach((c) => c.classList.remove("active"));
  const chartCard = document.querySelector(
    `.chart-card[data-type="${currentChartType}"]`
  );
  if (chartCard) chartCard.classList.add("active");

  document.querySelectorAll(".chart-settings").forEach((s) => s.classList.add("hidden"));
  const targetSettings = document.getElementById(
    `${currentChartType}-chart-settings`
  );
  if (targetSettings) targetSettings.classList.remove("hidden");

  if (availableColumns.length > 0) {
    updateAxisOptions(availableColumns, currentChartType);
    applyCachedSettingsForType(currentChartType);
  }
}

// ⬇️ Сохраняем график, preview и столбцы
function saveGraphToLocalStorage(graphData, layout, columns, previewHTML) {
  localStorage.setItem("chartGraph", JSON.stringify(graphData));
  localStorage.setItem("chartLayout", JSON.stringify(layout));
  localStorage.setItem("chartColumns", JSON.stringify(columns));
  localStorage.setItem("chartPreview", previewHTML);
}

/** Сброс отображаемого графика и сохранённого снимка (новая загрузка файла). */
function clearChartSurfaceAndStoredGraph() {
  clearTimeout(chartPreviewTimer);
  chartPreviewTimer = null;
  if (chartFetchAbort) {
    chartFetchAbort.abort();
    chartFetchAbort = null;
  }

  const plotDiv = document.getElementById("chart-container");
  if (plotDiv) {
    try {
      if (typeof Plotly !== "undefined") {
        Plotly.purge(plotDiv);
      }
    } catch (e) {
      /* ignore */
    }
    plotDiv.innerHTML = "";
  }
  const titleEl = document.getElementById("chart-title-header");
  if (titleEl) titleEl.textContent = "";
  try {
    localStorage.removeItem("chartGraph");
    localStorage.removeItem("chartLayout");
  } catch (e) {
    /* ignore */
  }
}

// ⬇️ Восстанавливаем график, preview и столбцы
function restoreGraphFromLocalStorage() {
  const graphData = JSON.parse(localStorage.getItem("chartGraph") || "null");
  const layout = JSON.parse(localStorage.getItem("chartLayout") || "null");
  const columns = JSON.parse(localStorage.getItem("chartColumns") || "[]");
  const previewHTML = localStorage.getItem("chartPreview");

  if (previewHTML) {
    const previewBlock = document.getElementById("data-preview");
    previewBlock.innerHTML = previewHTML;
    previewBlock.style.display = "block";
    previewBlock.style.opacity = "1";          // добавлено
    previewBlock.style.visibility = "visible"; // добавлено

    document.getElementById("error-message").style.display = "none";
    document.getElementById("delete-file-btn").style.display = "inline-block";
  }

  if (columns.length > 0) {
    availableColumns = columns;
    if (currentChartType) {
      updateAxisOptions(columns, currentChartType);
    }
    // Активируем вкладки 2 и 3
    document.querySelectorAll(".tab-item").forEach((tab) => {
      if (["tab-2", "tab-3"].includes(tab.dataset.tab)) {
        tab.classList.remove("disabled");
      }
    });
  }

  if (graphData && layout) {
    // 1) Если в layout есть title — берём его, иначе возьмём из chartSettings
    const ls = JSON.parse(localStorage.getItem("chartSettings") || "{}");
    const lastT = ls.lastType && CHART_TYPES.includes(String(ls.lastType).trim())
      ? String(ls.lastType).trim()
      : null;
    const typeKey = currentChartType || lastT;
    // 1) Nested (новый формат)
    let headerText = typeKey ? ls[typeKey]?.chartTitle : undefined;
    // 2) Flat (старый формат), на всякий случай
    if (!headerText && typeKey && ls[`${typeKey}-title`]) {
      headerText = ls[`${typeKey}-title`];
    }
    // 3) Ещё можно брать из layout, если всё остальное не помогло
    headerText = headerText || layout.title?.text || "";

    // 2) Удаляем title из макета, чтобы на графике он не рисовался
    delete layout.title;

    const layoutWithMargins = applyAxisMargins(
      { ...layout, autosize: true, dragmode: "pan" },
      graphData
    );
    const plotLayout = applyAppearanceToPlotLayout(layoutWithMargins);

    // 4) Устанавливаем шапочный заголовок
    document.getElementById("chart-title-header").textContent = headerText;

    // 5) Рисуем график
    const plotDiv = document.getElementById("chart-container");
    Plotly.newPlot(plotDiv, graphData, plotLayout, {
      displaylogo: false,
      responsive: true,
      modeBarButtonsToRemove: ["zoom2d", "lasso2d", "select2d"],
      scrollZoom: true,
    }).then(() => Plotly.Plots.resize(plotDiv));
  }
}
