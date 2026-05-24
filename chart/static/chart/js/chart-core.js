/* Charthaven: модалки, CSRF, escapeHtml, drag-and-drop файла. Загружается первым. */
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

/** Токен CSRF для fetch/XHR (cookie или скрытое поле из {% csrf_token %}). */
function getCsrfToken() {
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch (e) {
      return m[1];
    }
  }
  const input = document.querySelector("input[name=csrfmiddlewaretoken]");
  return input && input.value ? input.value : "";
}

function escapeHtml(str) {
  if (str == null || str === "") return "";
  const d = document.createElement("div");
  d.textContent = String(str);
  return d.innerHTML;
}

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.querySelector(".file-input");
  if (!fileInput) return;

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
