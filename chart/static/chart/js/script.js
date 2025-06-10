// Функция для отображения модального окна с сообщением
function showCustomAlert(message, callback) {
  const modal = document.getElementById("custom-alert");
  const alertMessage = document.getElementById("alert-message");
  const okButton = document.getElementById("alert-ok-btn");

  alertMessage.textContent = message;

  modal.classList.add("show"); // Добавляем класс для показа модального окна

  // Закрытие модального окна при клике на кнопку "OK"
  okButton.onclick = function () {
    modal.classList.remove("show"); // Убираем класс для скрытия модального окна
    if (callback) callback(); // Вызов callback после закрытия (если есть)
  };

  // Закрытие модального окна при клике на кнопку закрытия (X)
  const closeBtn = document.getElementById("close-alert-btn");
  closeBtn.onclick = function () {
    modal.classList.remove("show"); // Убираем класс для скрытия модального окна
    if (callback) callback();
  };

  // Закрытие модального окна при клике за пределами окна
  window.onclick = function (event) {
    if (event.target === modal) {
      modal.classList.remove("show"); // Убираем класс для скрытия модального окна
      if (callback) callback();
    }
  };
}

// Заменяем стандартный alert на кастомный
window.alert = function (message) {
  showCustomAlert(message);
};

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

// Боковая панель (прокрутка)

// Получаем контейнер вкладок
const sidebarHeader = document.querySelector(".sidebar-header");

// Добавляем обработчик события для колесика мыши
sidebarHeader.addEventListener("wheel", function (e) {
  if (e.deltaY === 0) return; // Проверяем, что прокрутка идет по вертикали (для горизонтальной прокрутки)

  // Прокручиваем по горизонтали
  gsap.to(sidebarHeader, {
    scrollLeft: sidebarHeader.scrollLeft + e.deltaY,
    duration: 0.5,
    ease: "power2.out",
  }); // Используем deltaY для горизонтальной прокрутки
  e.preventDefault(); // Предотвращаем стандартное поведение прокрутки
});

// Боковая панель (вкладки и контент)
const tabs = document.querySelectorAll(".tab-item");
const tabContents = document.querySelectorAll(".tab-content");

// Добавляем обработчик событий на все вкладки
tabs.forEach((tab) => {
  tab.addEventListener("click", (e) => {
    e.preventDefault();

    // Эффект волны при нажатии на вкладку
    gsap.to(tab, {
      scale: 0.99, // Легкое уменьшение размера вкладки
      duration: 0.2,
      ease: "power1.inOut",
      onComplete: () => {
        gsap.to(tab, {
          scale: 1, // Восстановление нормального размера
          duration: 0.2,
          ease: "power1.out",
        });
      },
    });

    // Убираем активный класс с всех вкладок и контентов
    tabs.forEach((tab) => tab.classList.remove("active"));
    tabContents.forEach((content) => {
      content.classList.remove("active");
    });

    // Добавляем активный класс на выбранную вкладку и контент
    const target = document.querySelector(`#${tab.dataset.tab}`);
    tab.classList.add("active");
    target.classList.add("active");

    // Анимация появления содержимого
    gsap.fromTo(
      target,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    );

    localStorage.setItem("activeTab", tab.dataset.tab);
  });
});

let availableColumns = []; // Глобальная переменная для хранения загруженных столбцов
let currentChartType = null; // Глобальная переменная для текущего выбранного типа графика
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
      // Убираем активный класс со всех карточек
      chartCards.forEach((c) => c.classList.remove("active"));

      // Добавляем активный класс к текущей карточке
      card.classList.add("active");

      // Получаем тип графика из атрибута data-type
      currentChartType = card.getAttribute("data-type"); // Сохраняем тип графика

      // Скрываем все настройки
      chartSettings.forEach((settings) => settings.classList.add("hidden"));

      // Показываем настройки для выбранного типа графика
      const targetSettings = document.getElementById(
        `${currentChartType}-chart-settings`
      );
      if (targetSettings) {
        targetSettings.classList.remove("hidden");
      }
      // Анимация появления содержимого
      gsap.fromTo(
        targetSettings,
        { opacity: 0, y: 100 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );

      // Устанавливаем значение в поле выбора типа графика
      if (chartTypeInput) {
        chartTypeInput.value = currentChartType;
      }

      // Обновляем выпадающие списки для осей
      if (availableColumns.length > 0) {
        updateAxisOptions(availableColumns, currentChartType);
      } else {
        console.error("Столбцы для осей не загружены.");
      }
    });
  });
});

// Динамическое обновление данных с помощью AJAX
document.getElementById("upload-form").addEventListener("submit", function (e) {
  if (typeof window.isAuthenticated !== "undefined" && !window.isAuthenticated) {
    e.preventDefault();
    showCustomAlert("Пожалуйста, войдите в аккаунт, чтобы загружать файлы.");
    return;
  }
  e.preventDefault(); // Останавливаем стандартную отправку формы

  let formData = new FormData(this); // Получаем данные из формы

  // Показываем прогресс-бар
  document.getElementById("progress-container").style.display = "block";
  const progressBar = document.getElementById("progress-bar");

  // Создаем объект XMLHttpRequest для отслеживания прогресса
  const xhr = new XMLHttpRequest();

  xhr.open("POST", "/upload/", true);

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
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText);

      localStorage.setItem('uploadedFileId', data.uploadedFileId);
      localStorage.setItem('uploadedFileName', data.uploadedFileName);
      localStorage.setItem("fileUploaded", "true");
      localStorage.setItem("chartPreview", data.preview_data);
      localStorage.setItem("chartColumns", JSON.stringify(data.columns));

      // Очистка старых данных
      availableColumns = []; // Сброс доступных столбцов
      currentChartType = null;

      // Если на сервере произошла ошибка
      if (data.error) {
        document.getElementById("error-message").innerText = data.error;
        document.getElementById("error-message").style.display = "block"; // Показываем ошибку
        document.getElementById("data-preview").style.display = "none"; // Прячем данные
        document.getElementById("error-message").classList.add("show"); // Добавляем анимацию
      } else {
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
        // document.getElementById("delete-file-btn").style.display =
        //   "inline-block";
        const deleteButton = document.getElementById("delete-file-btn");
        deleteButton.style.display = "inline-block";

        // Сбросить настройки графика
        // Очистить отображение настроек графика и вернуться к выбору типа графика
        chartSettings.forEach((settings) => settings.classList.add("hidden"));
        const chartCards = document.querySelectorAll(".chart-card");
        chartCards.forEach((card) => card.classList.remove("active"));
        currentChartType = null;

        // Сбросить поля выбора осей (если есть)
        /*const xAxisSelects = document.querySelectorAll("select[id$='-x-axis']");
        const yAxisSelects = document.querySelectorAll("select[id$='-y-axis']");
        xAxisSelects.forEach((select) => (select.innerHTML = ""));
        yAxisSelects.forEach((select) => (select.innerHTML = ""));*/

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

        // Сбросить все цвета для круговой диаграммы
        /*const pieColorPalette = document.getElementById("pie-custom-colors");
        if (pieColorPalette) {
          // Удалим все дополнительные добавленные цвета
          const colorInputs = pieColorPalette.querySelectorAll(
            "input[type='color']"
          );
          colorInputs.forEach((input) => input.remove()); // Удаляем все цвета
          // Сбросим цветовую палитру до исходной
          const initialColor = document.createElement("input");
          initialColor.type = "color";
          initialColor.classList.add("input-color");
          initialColor.value = "#ff0000"; // Устанавливаем первый стандартный цвет
          pieColorPalette.prepend(initialColor);
        }*/
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

// Добавление и удаление цветов в круговой диаграмме
document.addEventListener("DOMContentLoaded", function () {
  const pieColorContainer = document.getElementById("pie-custom-colors");
  const addColorButton = document.getElementById("add-color");
  const deleteColorButton = document.getElementById("delete-color");

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
        onComplete: savePieColorsToLocalStorage, // Сохраняем после добавления
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
          savePieColorsToLocalStorage(); // Сохраняем после удаления
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


// Переключение видимости дополнительных настроек
/*document
  .getElementById("toggle-advanced-settings-btn")
  .addEventListener("click", function () {
    const advancedSettings = document.getElementById("advanced-settings");
    const icon = this.querySelector(".icon");
    if (advancedSettings.classList.contains("hidden")) {
      advancedSettings.classList.remove("hidden");
      gsap.fromTo(
        advancedSettings,
        { height: 0, opacity: 0 },
        { height: "auto", opacity: 1, duration: 0.5, ease: "power2.out" }
      );
      icon.style.transform = "rotate(180deg)";
    } else {
      // Если настройки видимы, скрыть их с анимацией
      gsap.to(advancedSettings, {
        height: 0,
        opacity: 0,
        duration: 0.5,
        ease: "power2.in",
        onComplete: () => advancedSettings.classList.add("hidden"),
      });
      icon.style.transform = "rotate(0deg)";
    }
  });*/

// Создать plotly график
document
  .getElementById("create-chart-btn")
  .addEventListener("click", function () {
    const chartType = document.getElementById("chart-type").value;
    if (!chartType) {
      alert("Пожалуйста, выберите тип графика.");
      return;
    }

    const chartData = {
      chartType,
      chartTitle:
        document.getElementById(`${chartType}-title`).value || "Без названия",
    };
    console.log("Данные для отправки:", chartData);

    // Устанавливаем подписи осей в зависимости от типа графика
    if (chartType === "line" || chartType === "bar") {
      chartData.xLabel =
        document.getElementById(`${chartType}-x-axis-label`).value || "";
      chartData.yLabel =
        document.getElementById(`${chartType}-y-axis-label`).value || "";
    } else if (chartType === "hist") {
      chartData.xLabel =
        document.getElementById("hist-x-axis-label").value || "";
      chartData.yLabel = ""; // Для гистограммы ось Y не подписывается
    } else {
      chartData.xLabel = "";
      chartData.yLabel = "";
    }

    // Сохраняем заголовок и подписи осей
    const chartTitleHeader = document.getElementById("chart-title-header");
    chartTitleHeader.textContent = chartData.chartTitle;

    // Собираем данные в зависимости от типа графика
    if (chartType === "line") {
      chartData.xAxis = document.getElementById(`${chartType}-x-axis`).value;
      chartData.yAxis = document.getElementById(`${chartType}-y-axis`).value;
      chartData.chartColor =
        document.getElementById(`${chartType}-color`)?.value || "#000000";
      chartData.lineWidth = document.getElementById("line-width")?.value || 2;
      chartData.lineStyle =
        document.getElementById("line-style")?.value || "solid";
    } else if (chartType === "bar") {
      chartData.xAxis = document.getElementById(`${chartType}-x-axis`).value;
      chartData.yAxis = document.getElementById(`${chartType}-y-axis`).value;
      chartData.chartColor =
        document.getElementById(`${chartType}-color`)?.value || "#000000";
    } else if (chartType === "pie") {
      chartData.xAxis = document.getElementById("pie-x-axis").value;
      chartData.yAxis = document.getElementById("pie-y-axis").value;
      const colorInputs = document.querySelectorAll(
        "#pie-custom-colors .input-color"
      );
      chartData.chartColors = Array.from(colorInputs).map(
        (input) => input.value
      );
    } else if (chartType === "hist") {
      chartData.xAxis = document.getElementById("hist-x-axis").value;
      chartData.bins = document.getElementById("hist-bins")?.value || 10;
      chartData.chartColor =
        document.getElementById(`${chartType}-color`)?.value || "#000000";
    }

    // Проверка обязательных полей для каждого типа графика
    if (chartType === "line" || chartType === "bar") {
      if (!chartData.xAxis || !chartData.yAxis) {
        alert(
          "Пожалуйста, заполните оси X и Y для линейного или столбчатого графика."
        );
        return;
      }
    } else if (chartType === "pie") {
      if (!chartData.xAxis || !chartData.yAxis) {
        alert(
          "Для круговой диаграммы укажите параметры X (категории) и Y (значения)."
        );
        return;
      }
    } else if (chartType === "hist") {
      if (!chartData.xAxis) {
        alert("Для гистограммы необходимо указать ось X.");
        return;
      }
      if (!chartData.bins) {
        alert(
          "Пожалуйста, укажите количество интервалов (бинов) для гистограммы."
        );
        return;
      }
    } else {
      alert("Неизвестный тип графика. Проверьте ввод.");
      return;
    }

    chartData.uploadedFileId   = localStorage.getItem('uploadedFileId');

    // Формируем запрос для создания графика
    fetch("/create_chart/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chartData),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          // Если ошибка при создании графика
          alert(data.error);
        } else {
          // Отображаем график
          const plotDiv = document.getElementById("chart-container");

          // Очистка контейнера перед обновлением графика
          plotDiv.innerHTML = "";

          // Анимация контейнера
          gsap.fromTo(
            plotDiv,
            { opacity: 0, y: 0 },
            { opacity: 1, y: 0, duration: 0.5, ease: "bounce.out" }
          );

          // Обновляем заголовок графика
          chartTitleHeader.textContent = chartData.chartTitle;

          const config = {
            displaylogo: false, // Убираем логотип Plotly
            modeBarButtonsToRemove: [
              "toImage",
              "zoom2d", // Удаляем кнопку зума
              "lasso2d", // Удаляем лассо
              "select2d", // Удаляем инструмент выделения
            ],
            modeBarButtonsToAdd: [], // Вы можете добавить свои кнопки сюда
          };

          // Используем Plotly для отрисовки графика
          Plotly.newPlot(
            plotDiv,
            data.graphData,
            {
              ...data.layout,
              title: "",
              dragmode: "pan", // Включаем режим панорамирования
              scrollZoom: true, // Поддержка зума
              displayModeBar: true, // Панель инструментов
              responsive: true,
              autosize: true, // Поддержка адаптивного размера
              margin: {
                l: 100, // Отступ слева
                r: 50, // Отступ справа
                t: 50, // Отступ сверху
                b: 110, // Отступ снизу для подписи оси X
              },
            },
            config
          );

          saveGraphToLocalStorage(data.graphData, data.layout, availableColumns, document.getElementById("data-preview").innerHTML);
          saveSettingsToLocalStorage();
          // Добавляем обработчик изменения размера окна
          window.addEventListener("resize", function () {
            Plotly.Plots.resize(plotDiv); // Перерисовываем график при изменении размера окна
          });
        }
      })
      .catch((error) => {
        console.error("Ошибка при создании графика:", error);
        alert("Произошла ошибка при создании графика.");
      });
  });

// Кнопка "Удалить файл"
document.addEventListener("DOMContentLoaded", function () {
  const deleteFileBtn = document.getElementById("delete-file-btn");
  const deleteModal = document.getElementById("deleteModal");
  const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
  const cancelDeleteBtn = document.getElementById("cancel-delete-btn");

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

// Добавляем функционал кнопки "Скачать график"
document.querySelector(".download").addEventListener("click", function () {
  const plotDiv = document.getElementById("chart-container");
  // Проверяем, существует ли график и его данные
  if (!plotDiv || !plotDiv.data || plotDiv.data.length === 0) {
    alert("График не создан. Пожалуйста, создайте график перед скачиванием.");
    return;
  }
  const chartTitle =
    document.getElementById("chart-title-header").textContent.trim() || "chart";

  // Создаём временный layout с заголовком
  const originalLayout = JSON.parse(JSON.stringify(plotDiv.layout || {})); // Копируем оригинальный layout
  const layoutWithTitle = {
    ...originalLayout,
    title: {
      text: chartTitle,
      font: {
        size: 16,
      },
      x: 0.5, // Центрируем заголовок
      xanchor: "center",
    },
  };

  // Добавляем временный заголовок, скачиваем и восстанавливаем исходный макет
  Plotly.relayout(plotDiv, layoutWithTitle)
    .then(() => {
      const { width, height } = plotDiv.getBoundingClientRect();

      return Plotly.downloadImage(plotDiv, {
        format: "png", // Формат изображения
        width: Math.round(width), // Ширина изображения
        height: Math.round(height), // Высота изображения
        filename: chartTitle.replace(/[<>:"/\\|?*]/g, "_"), // Убираем запрещённые символы
      });
    })
    .finally(() => {
      // Восстанавливаем исходный макет
      Plotly.relayout(plotDiv, originalLayout);
    });
});


function saveSettingsToLocalStorage() {
  if (!currentChartType) return;

  // 1) Получаем весь объект из localStorage (или пустой)
  const allSettings = JSON.parse(localStorage.getItem("chartSettings") || "{}");

  // 2) Собираем настройки только для текущего типа
  const settings = {
    chartTitle: document.getElementById(`${currentChartType}-title`)?.value || "",
    xAxis:      document.getElementById(`${currentChartType}-x-axis`)?.value || "",
    yAxis:      document.getElementById(`${currentChartType}-y-axis`)?.value || "",
    xLabel:     document.getElementById(`${currentChartType}-x-axis-label`)?.value || "",
    yLabel:     document.getElementById(`${currentChartType}-y-axis-label`)?.value || "",
    color:      document.getElementById(`${currentChartType}-color`)?.value || "",
    lineWidth:  document.getElementById("line-width")?.value || 2,
    lineStyle:  document.getElementById("line-style")?.value || "solid",
  };

  // 3) Кладём их в словарь по ключу currentChartType
  allSettings[currentChartType] = settings;

  // 4) Запоминаем последний выбранный тип (чтобы знать, какой восстанавливать)
  allSettings.lastType = currentChartType;

  // 5) Записываем обратно
  localStorage.setItem("chartSettings", JSON.stringify(allSettings));
}

// Восстановление настроек из localStorage
function restoreSettingsFromLocalStorage() {
  const allSettings = JSON.parse(localStorage.getItem("chartSettings") || "{}");
  const type = allSettings.lastType;
  if (!type) return;

  currentChartType = type;
  document.getElementById("chart-type").value = currentChartType;

  // Активируем карточку и вкладку
  const chartCard = document.querySelector(`.chart-card[data-type="${currentChartType}"]`);
  if (chartCard) chartCard.click();

  // Получаем настройки для этого типа
  const settings = allSettings[currentChartType] || {};

  // Ждём, пока опции появятся и DOM обновится
  setTimeout(() => {
    const apply = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };

    apply(`${currentChartType}-title`, settings.chartTitle);
    apply(`${currentChartType}-x-axis`, settings.xAxis);
    apply(`${currentChartType}-y-axis`, settings.yAxis);
    apply(`${currentChartType}-x-axis-label`, settings.xLabel);
    apply(`${currentChartType}-y-axis-label`, settings.yLabel);
    apply(`${currentChartType}-color`, settings.color);

    if (currentChartType === "line") {
      apply("line-width", settings.lineWidth);
      apply("line-style", settings.lineStyle);
      document.getElementById("line-width-value").textContent = settings.lineWidth;
    }
    if (currentChartType === "hist") {
      apply("hist-x-axis", settings.xAxis);
    }
  }, 300);
}

// ⬇️ Сохраняем график, preview и столбцы
function saveGraphToLocalStorage(graphData, layout, columns, previewHTML) {
  localStorage.setItem("chartGraph", JSON.stringify(graphData));
  localStorage.setItem("chartLayout", JSON.stringify(layout));
  localStorage.setItem("chartColumns", JSON.stringify(columns));
  localStorage.setItem("chartPreview", previewHTML);
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
    // 1) Nested (новый формат)
    let headerText = ls[currentChartType]?.chartTitle;
    // 2) Flat (старый формат), на всякий случай
    if (!headerText && ls[`${currentChartType}-title`]) {
      headerText = ls[`${currentChartType}-title`];
    }
    // 3) Ещё можно брать из layout, если всё остальное не помогло
    headerText = headerText || layout.title?.text || "";

    // 2) Удаляем title из макета, чтобы на графике он не рисовался
    delete layout.title;

    // 3) Убираем лишний top‑margin
    layout.margin = layout.margin || {};
    layout.margin.t = 50;
    layout.margin.b = 110;
    layout.margin.l = 100;
    layout.margin.r = 50;

    // 4) Устанавливаем шапочный заголовок
    document.getElementById("chart-title-header").textContent = headerText;

    // 5) Рисуем график
    const plotDiv = document.getElementById("chart-container");
    Plotly.newPlot(plotDiv, graphData, layout, {
      displaylogo: false,
      responsive: true,
      modeBarButtonsToRemove: ["zoom2d", "lasso2d", "select2d"],
      scrollZoom: true,
    }).then(() => Plotly.Plots.resize(plotDiv));
  }
}

// Функция загрузки списка сохранённых графиков
function loadSavedCharts() {
  if (typeof window.isAuthenticated !== "undefined" && !window.isAuthenticated) {
    showCustomAlert("Пожалуйста, войдите в аккаунт, чтобы просматривать сохранённые графики.");
    return;
  }
  fetch('/api/saved-charts/')
    .then(res => {
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
    .then(data => {
      const container = document.getElementById('savedChartsContainer');
      container.innerHTML = '';
      if (!data.charts || !data.charts.length) {
        container.innerHTML = '<p>Нет сохранённых графиков.</p>';
        return;
      }
      data.charts.forEach(ch => {
        const btn = document.createElement('button');
        btn.className = 'saved-chart-btn';
        btn.innerHTML = `
          <strong>${ch.fileName}</strong><br>
          Тип: ${ch.chartType}<br>
          Дата: ${new Date(ch.createdAt).toLocaleString()}
        `;
        btn.addEventListener('click', () => loadSavedChart(ch.id));
        container.appendChild(btn);
      });
    })
    .catch(err => console.error('Не удалось получить сохранённые графики:', err));
}

// Функция загрузки одного сохранённого графика по его ID
function loadSavedChart(chartId) {
  if (typeof window.isAuthenticated !== "undefined" && !window.isAuthenticated) {
    showCustomAlert("Пожалуйста, войдите в аккаунт, чтобы просматривать сохранённые графики.");
    return;
  }
  fetch(`/api/saved-charts/${chartId}/`)
    .then(res => {
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
    .then(obj => {
      const {
        chartType,
        dataJson,
        layoutJson
      } = obj;
      const plotDiv = document.getElementById("chart-container");
      plotDiv.innerHTML = "";
      gsap.fromTo(
        plotDiv,
        { opacity: 0, y: 0 },
        { opacity: 1, y: 0, duration: 0.5, ease: "bounce.out" }
      );
      const config = {
        displaylogo: false,
        modeBarButtonsToRemove: [
          "toImage",
          "zoom2d",
          "lasso2d",
          "select2d",
        ],
        modeBarButtonsToAdd: [],
      };
      Plotly.newPlot(
        plotDiv,
        dataJson,
        layoutJson,
        {
          ...config,
          scrollZoom: true,
        }
      );
    })
    .catch(err => console.error('Не удалось загрузить график:', err));
}

// Привязка сохранения к изменениям в input'ах и select'ах
document.addEventListener("DOMContentLoaded", () => {
  restoreGraphFromLocalStorage();
  restoreSettingsFromLocalStorage();

  const savedSettings = JSON.parse(localStorage.getItem("chartSettings") || "null");
  if (savedSettings) {
    Object.entries(savedSettings).forEach(([id, value]) => {
    const input = document.getElementById(id);
    if (input) {
        input.value = value;
        // Для ползунка толщины линии — обновляем значение на экране
        if (id === "line-width") {
            document.getElementById("line-width-value").textContent = value;
        }
    }
    });
  }


  const savedTabId = localStorage.getItem("activeTab");
  if (savedTabId) {
      // Удаляем активность со всех вкладок и контента
      document.querySelectorAll(".tab-item").forEach((tab) => {
        tab.classList.remove("active");
        if (tab.dataset.tab === savedTabId) {
          tab.classList.add("active");
        }
      });

      document.querySelectorAll(".tab-content").forEach((content) => {
        content.classList.remove("active");
        if (content.id === savedTabId) {
          content.classList.add("active");
        }
      });
  }


  document.querySelectorAll("#tab-2 input, #tab-2 select").forEach((element) => {
      element.addEventListener("change", () => {
        const settings = {};
        document.querySelectorAll("#tab-2 input, #tab-2 select").forEach((el) => {
          settings[el.id] = el.value;
        });
        localStorage.setItem("chartSettings", JSON.stringify(settings));
      });
    });

    // — вызываем загрузку сохранённых графиков при старте
    // loadSavedCharts();

    // — и при клике на саму вкладку «Созранённые графики»
    document.querySelector('.tab-item[data-tab="tab-3"]')
          .addEventListener('click', loadSavedCharts);
});

document.addEventListener("DOMContentLoaded", function () {
  const burgerBtn = document.getElementById("burgerBtn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (burgerBtn && sidebar && overlay) {
    burgerBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const isOpen = sidebar.classList.toggle("open");
      overlay.style.display = isOpen ? "block" : "none";
    });
    overlay.addEventListener("click", function () {
      sidebar.classList.remove("open");
      overlay.style.display = "none";
    });
  }
});


