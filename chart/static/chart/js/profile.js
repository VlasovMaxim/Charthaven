/**
 * Личный кабинет: проверка логина, текущего пароля и новых паролей.
 */
(function () {
  const cfg = document.getElementById("profile-page-config");
  if (!cfg) return;

  function getCookie(name) {
    const m = document.cookie.match("(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)");
    return m ? decodeURIComponent(m[1]) : "";
  }

  function setInputState(el, state) {
    el.classList.remove("profile-input--neutral", "profile-input--valid", "profile-input--invalid");
    if (state) el.classList.add("profile-input--" + state);
  }

  function setHint(el, text, kind) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.remove("profile-live-hint--ok", "profile-live-hint--bad", "profile-live-hint--muted");
    if (!text) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    if (kind === "ok") el.classList.add("profile-live-hint--ok");
    else if (kind === "bad") el.classList.add("profile-live-hint--bad");
    else el.classList.add("profile-live-hint--muted");
  }

  const USERNAME_RE = /^[A-Za-z0-9_]+$/;
  const USERNAME_MIN_LEN = 5;
  const checkUsernameUrl = cfg.dataset.checkUsernameUrl;
  const userEl = document.getElementById("id_username");
  const hintUser = document.getElementById("live-username");

  if (checkUsernameUrl && userEl && hintUser) {
    let userTimer = null;
    let userReq = null;

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

      fetch(checkUsernameUrl, {
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
          if (data.state === "ok" || data.state === "current") {
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
  }

  const verifyUrl = cfg.dataset.verifyUrl;
  const oldEl = document.getElementById("id_old_password");
  const n1El = document.getElementById("id_new_password1");
  const n2El = document.getElementById("id_new_password2");
  const hintOld = document.getElementById("live-old_password");
  const hintN1 = document.getElementById("live-new_password1");
  const hintN2 = document.getElementById("live-new_password2");

  if (!verifyUrl || !oldEl || !n1El || !n2El || !hintOld || !hintN1 || !hintN2) {
    return;
  }

  const MIN_LEN = 8;
  let oldTimer = null;
  let oldReq = null;

  function verifyOldPassword(value) {
    if (oldReq && typeof oldReq.abort === "function") oldReq.abort();
    const v = value.trim();
    if (!v) {
      setHint(hintOld, "", null);
      setInputState(oldEl, "neutral");
      return;
    }

    const csrf = getCookie("csrftoken");
    oldReq = new AbortController();
    const t = oldReq;

    fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrf,
      },
      body: JSON.stringify({ password: v }),
      signal: oldReq.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (t.signal.aborted) return;
        if (data.ok) {
          setHint(hintOld, "Пароль верный", "ok");
          setInputState(oldEl, "valid");
        } else {
          setHint(hintOld, "Неверный пароль", "bad");
          setInputState(oldEl, "invalid");
        }
      })
      .catch(() => {
        if (t.signal.aborted) return;
        setHint(hintOld, "Не удалось проверить", "bad");
        setInputState(oldEl, "neutral");
      });
  }

  oldEl.addEventListener("input", function () {
    const val = oldEl.value;
    setHint(hintOld, val ? "Проверка…" : "", "muted");
    if (val) setInputState(oldEl, "neutral");
    else {
      setInputState(oldEl, "neutral");
      setHint(hintOld, "", null);
    }
    clearTimeout(oldTimer);
    oldTimer = setTimeout(function () {
      verifyOldPassword(val);
    }, 420);
  });

  function checkNew1() {
    const v = n1El.value;
    if (!v) {
      setHint(hintN1, "", null);
      setInputState(n1El, "neutral");
      return;
    }
    if (v.length < MIN_LEN) {
      setHint(hintN1, "Минимум " + MIN_LEN + " символов", "bad");
      setInputState(n1El, "invalid");
      return;
    }
    let strength = "достаточная сложность";
    const hasLetter = /[A-Za-zА-Яа-яЁё]/.test(v);
    const hasDigit = /\d/.test(v);
    if (v.length >= 12 && hasLetter && hasDigit) strength = "хороший пароль";
    else if (v.length < 10 || !hasLetter || !hasDigit)
      strength = "лучше добавить буквы и цифры";
    setHint(hintN1, "Длина: " + v.length + " · " + strength, "ok");
    setInputState(n1El, "valid");
  }

  function checkMatch() {
    const a = n1El.value;
    const b = n2El.value;
    if (!b) {
      setHint(hintN2, "", null);
      setInputState(n2El, "neutral");
      return;
    }
    if (a === b) {
      setHint(hintN2, "Пароли совпадают", "ok");
      setInputState(n2El, "valid");
    } else {
      setHint(hintN2, "Пароли не совпадают", "bad");
      setInputState(n2El, "invalid");
    }
  }

  n1El.addEventListener("input", function () {
    checkNew1();
    checkMatch();
  });
  n2El.addEventListener("input", checkMatch);
})();
