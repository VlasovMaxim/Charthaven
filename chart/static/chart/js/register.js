/**
 * Регистрация: проверка логина и пароля в реальном времени (сервер).
 */
(function () {
  const cfg = document.getElementById("register-page-config");
  if (!cfg) return;

  const checkUserUrl = cfg.dataset.checkUsernameUrl;
  const validatePwdUrl = cfg.dataset.validatePasswordUrl;
  if (!checkUserUrl || !validatePwdUrl) return;

  const USERNAME_RE = /^[A-Za-z0-9_]+$/;
  const USERNAME_MIN_LEN = 5;

  function getCookie(name) {
    const m = document.cookie.match("(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)");
    return m ? decodeURIComponent(m[1]) : "";
  }

  const userEl = document.getElementById("id_username");
  const p1El = document.getElementById("id_password1");
  const p2El = document.getElementById("id_password2");
  const hintUser = document.getElementById("live-username");
  const hintP1 = document.getElementById("live-password1");
  const hintP2 = document.getElementById("live-password2");

  if (!userEl || !p1El || !p2El) return;

  function setInputState(el, state) {
    el.classList.remove("auth-input--neutral", "auth-input--valid", "auth-input--invalid");
    if (state) el.classList.add("auth-input--" + state);
  }

  function setHint(el, text, kind) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.remove("auth-live-hint--ok", "auth-live-hint--bad", "auth-live-hint--muted");
    if (!text) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    if (kind === "ok") el.classList.add("auth-live-hint--ok");
    else if (kind === "bad") el.classList.add("auth-live-hint--bad");
    else el.classList.add("auth-live-hint--muted");
  }

  let userTimer = null;
  let userReq = null;
  let pwdTimer = null;
  let pwdReq = null;

  function fetchCheckUsername(value) {
    if (userReq && typeof userReq.abort === "function") userReq.abort();
    const v = value.trim();
    if (!v) {
      setHint(hintUser, "", null);
      setInputState(userEl, "neutral");
      return;
    }
    if (v.length < USERNAME_MIN_LEN) {
      setHint(hintUser, "Минимум " + USERNAME_MIN_LEN + " символов.", "bad");
      setInputState(userEl, "invalid");
      return;
    }
    if (!USERNAME_RE.test(v)) {
      setHint(hintUser, "Только латинские буквы, цифры и подчёркивание.", "bad");
      setInputState(userEl, "invalid");
      return;
    }

    const csrf = getCookie("csrftoken");
    userReq = new AbortController();
    const t = userReq;

    fetch(checkUserUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrf,
      },
      body: JSON.stringify({ username: v }),
      signal: userReq.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (t.signal.aborted) return;
        if (!data.ok) {
          setHint(hintUser, "Ошибка проверки", "bad");
          setInputState(userEl, "neutral");
          return;
        }
        if (data.state === "ok") {
          setHint(hintUser, data.message || "Логин доступен.", "ok");
          setInputState(userEl, "valid");
        } else if (data.state === "taken" || data.state === "invalid") {
          setHint(hintUser, data.message || "Недопустимый логин", "bad");
          setInputState(userEl, "invalid");
        } else {
          setHint(hintUser, "", null);
          setInputState(userEl, "neutral");
        }
      })
      .catch(() => {
        if (t.signal.aborted) return;
        setHint(hintUser, "Не удалось проверить логин", "bad");
        setInputState(userEl, "neutral");
      });
  }

  userEl.addEventListener("input", function () {
    const val = userEl.value;
    if (val.trim()) {
      setHint(hintUser, "Проверка…", "muted");
      setInputState(userEl, "neutral");
    } else {
      setHint(hintUser, "", null);
      setInputState(userEl, "neutral");
    }
    clearTimeout(userTimer);
    userTimer = setTimeout(function () {
      fetchCheckUsername(val);
    }, 400);
  });

  function fetchValidatePassword(value) {
    if (pwdReq && typeof pwdReq.abort === "function") pwdReq.abort();
    const v = value;
    if (!v) {
      setHint(hintP1, "", null);
      setInputState(p1El, "neutral");
      checkMatch();
      return;
    }

    const csrf = getCookie("csrftoken");
    pwdReq = new AbortController();
    const t = pwdReq;

    fetch(validatePwdUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrf,
      },
      body: JSON.stringify({ password: v }),
      signal: pwdReq.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (t.signal.aborted) return;
        if (!data.ok) {
          setHint(hintP1, "Ошибка проверки пароля", "bad");
          setInputState(p1El, "neutral");
          checkMatch();
          return;
        }
        if (data.valid === true) {
          setHint(hintP1, "Пароль подходит", "ok");
          setInputState(p1El, "valid");
        } else if (data.valid === false && data.messages && data.messages.length) {
          setHint(hintP1, data.messages.join(" "), "bad");
          setInputState(p1El, "invalid");
        } else {
          setHint(hintP1, "", null);
          setInputState(p1El, "neutral");
        }
        checkMatch();
      })
      .catch(() => {
        if (t.signal.aborted) return;
        setHint(hintP1, "Не удалось проверить пароль", "bad");
        setInputState(p1El, "neutral");
        checkMatch();
      });
  }

  function checkMatch() {
    const a = p1El.value;
    const b = p2El.value;
    if (!b) {
      setHint(hintP2, "", null);
      setInputState(p2El, "neutral");
      return;
    }
    if (a === b) {
      setHint(hintP2, "Пароли совпадают", "ok");
      setInputState(p2El, "valid");
    } else {
      setHint(hintP2, "Пароли не совпадают", "bad");
      setInputState(p2El, "invalid");
    }
  }

  p1El.addEventListener("input", function () {
    const val = p1El.value;
    if (val) {
      setHint(hintP1, "Проверка…", "muted");
      setInputState(p1El, "neutral");
    } else {
      setHint(hintP1, "", null);
      setInputState(p1El, "neutral");
    }
    clearTimeout(pwdTimer);
    pwdTimer = setTimeout(function () {
      fetchValidatePassword(val);
    }, 420);
    checkMatch();
  });

  p2El.addEventListener("input", checkMatch);
})();
