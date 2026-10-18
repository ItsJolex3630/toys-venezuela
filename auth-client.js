/* ============================================================================
 * TOYS VENEZUELA · auth-client.js
 * Cliente ligero compartido para la UI de autenticación (paridad dual-device).
 * Se incluye con <script src="auth-client.js" defer></script> en:
 *   animado.html · sencillo.html · index.html
 *
 * Contrato de DOM (idéntico en los tres HTML):
 *   #auth-btn / #auth-txt                 → botón del header
 *   #auth-ov, #auth-modal                 → backdrop + diálogo
 *   [data-auth-view]                      → pestañas y vistas (login/signup/account)
 *   #auth-view-login, #auth-view-signup, #auth-view-account
 *   [data-auth-msg]                       → feedback de error/éxito
 *   #auth-name, #auth-email, #auth-role, #auth-points, #auth-panel-link, #auth-logout
 * ========================================================================== */
(function () {
  "use strict";

  var API = "/api/auth";

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* ---------------------------------------------------------------- estado */
  var state = { user: null };

  /* ---------------------------------------------------------------- fetch */
  function request(path, options) {
    var opts = options || {};
    opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    opts.credentials = "same-origin";
    return fetch(API + path, opts).then(function (res) {
      return res
        .json()
        .catch(function () {
          return {};
        })
        .then(function (body) {
          return { ok: res.ok, status: res.status, body: body };
        });
    });
  }

  /* --------------------------------------------------------------- errores */
  function translate(payload, fallback) {
    var raw =
      (payload && payload.message) ||
      (payload && payload.error && payload.error.message) ||
      (typeof payload === "string" ? payload : "") ||
      "";
    var msg = String(raw).toLowerCase();
    if (msg.indexOf("invalid email or password") > -1) return "Email o contraseña incorrectos.";
    if (msg.indexOf("password") > -1 && msg.indexOf("at least") > -1)
      return "La contraseña debe tener al menos 8 caracteres.";
    if (msg.indexOf("already exists") > -1 || msg.indexOf("already registered") > -1)
      return "Ese email ya está registrado. Inicia sesión.";
    if (msg.indexOf("invalid email") > -1) return "El email no es válido.";
    if (msg.indexOf("too many") > -1) return "Demasiados intentos. Espera un momento.";
    return raw ? String(raw) : fallback;
  }

  /* -------------------------------------------------------------- sesión */
  function fetchSession() {
    return request("/get-session", { method: "GET", headers: {} }).then(function (r) {
      state.user = (r.ok && r.body && r.body.user) || null;
      return state.user;
    });
  }

  /* ----------------------------------------------------------- render UI */
  function roleLabel(user) {
    if (user.role === "admin") return { text: "👑 Admin", cls: "admin" };
    if (user.role === "vip") return { text: "⭐ VIP", cls: "vip" };
    return { text: "Cliente Regular", cls: "customer" };
  }

  function firstName(user) {
    var n = (user.name || "").trim();
    return n ? n.split(/\s+/)[0] : "Mi cuenta";
  }

  function renderHeader() {
    var btn = $("#auth-btn");
    var txt = $("#auth-txt");
    if (!btn) return;
    if (state.user) {
      btn.classList.add("on");
      if (txt) txt.textContent = firstName(state.user);
      btn.setAttribute("aria-label", "Mi cuenta: " + (state.user.name || ""));
      if ($("#auth-ic")) $("#auth-ic").textContent = state.user.role === "admin" ? "👑" : "🙋";
    } else {
      btn.classList.remove("on");
      if (txt) txt.textContent = "Ingresar";
      btn.setAttribute("aria-label", "Mi Cuenta");
      if ($("#auth-ic")) $("#auth-ic").textContent = "👤";
    }
  }

  function renderAccount() {
    var u = state.user;
    if (!u) return;
    var label = roleLabel(u);
    if ($("#auth-name")) $("#auth-name").textContent = u.name || "—";
    if ($("#auth-email")) $("#auth-email").textContent = u.email || "—";
    if ($("#auth-avatar")) $("#auth-avatar").textContent = u.role === "admin" ? "👑" : "🙋";
    var roleEl = $("#auth-role");
    if (roleEl) {
      roleEl.textContent = label.text;
      roleEl.className = "auth-badge " + label.cls;
    }
    if ($("#auth-points")) $("#auth-points").textContent = String(u.loyaltyPoints || 0);
    var panel = $("#auth-panel-link");
    if (panel) panel.hidden = u.role !== "admin";
  }

  /* -------------------------------------------------------------- vistas */
  function showView(name) {
    $$(".auth-view").forEach(function (el) {
      el.classList.toggle("on", el.getAttribute("data-view") === name);
    });
    $$(".auth-tab").forEach(function (t) {
      t.classList.toggle("on", t.getAttribute("data-auth-view") === name);
    });
    var tabs = $("#auth-tabs");
    if (tabs) tabs.hidden = state.user ? name === "account" : false;
    clearMsg();
  }

  function visibleView() {
    var el = $(".auth-view.on");
    return el ? el.getAttribute("data-view") : "login";
  }

  function openModal(view) {
    var ov = $("#auth-ov");
    var modal = $("#auth-modal");
    if (!ov || !modal) return;
    var target = view || (state.user ? "account" : "login");
    if (state.user) renderAccount();
    showView(target);
    ov.classList.add("on");
    modal.classList.add("on");
    document.body.style.overflow = "hidden";
    var first = $(".auth-view.on input");
    if (first) setTimeout(function () { first.focus(); }, 260);
  }

  function closeModal() {
    var ov = $("#auth-ov");
    var modal = $("#auth-modal");
    if (ov) ov.classList.remove("on");
    if (modal) modal.classList.remove("on");
    document.body.style.overflow = "";
  }

  /* -------------------------------------------------------------- mensajes */
  function clearMsg() {
    $$("[data-auth-msg]").forEach(function (p) {
      p.textContent = "";
      p.classList.remove("ok");
    });
  }

  function setMsg(view, text, ok) {
    var el = $('[data-view="' + view + '"] [data-auth-msg]');
    if (!el) el = $(".auth-view.on [data-auth-msg]");
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("ok", !!ok);
  }

  /* ---------------------------------------------------------- submitting */
  function setLoading(form, on) {
    if (!form) return;
    var btn = form.querySelector(".auth-submit");
    if (!btn) return;
    if (on) {
      btn.dataset.label = btn.textContent;
      btn.textContent = "Un momento…";
      btn.disabled = true;
    } else {
      if (btn.dataset.label) btn.textContent = btn.dataset.label;
      btn.disabled = false;
    }
  }

  function field(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? String(el.value || "").trim() : "";
  }

  function onLoginSubmit(e) {
    e.preventDefault();
    var form = e.currentTarget;
    var email = field(form, "email");
    var password = field(form, "password");
    if (!email || !password) return setMsg("login", "Completa email y contraseña.");
    setLoading(form, true);
    clearMsg();
    request("/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email: email, password: password }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error(translate(r.body, "No pudimos iniciar sesión."));
        return fetchSession();
      })
      .then(function () {
        renderHeader();
        renderAccount();
        form.reset();
        closeModal();
        showView(state.user ? "account" : "login");
      })
      .catch(function (err) {
        setMsg("login", err.message || "Error inesperado. Intenta de nuevo.");
      })
      .then(function () {
        setLoading(form, false);
      });
  }

  function onSignupSubmit(e) {
    e.preventDefault();
    var form = e.currentTarget;
    var name = field(form, "name");
    var email = field(form, "email");
    var password = field(form, "password");
    var phone = field(form, "phone");
    if (!name || !email || !password) return setMsg("signup", "Completa nombre, email y contraseña.");
    if (password.length < 8) return setMsg("signup", "La contraseña debe tener al menos 8 caracteres.");
    setLoading(form, true);
    clearMsg();
    request("/sign-up/email", {
      method: "POST",
      body: JSON.stringify({ name: name, email: email, password: password, phone: phone || undefined }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error(translate(r.body, "No pudimos crear tu cuenta."));
        return fetchSession();
      })
      .then(function () {
        renderHeader();
        form.reset();
        if (state.user) {
          showView("account");
          renderAccount();
          setMsg("account", "¡Bienvenido/a, " + firstName(state.user) + "! 🧸", true);
        }
      })
      .catch(function (err) {
        setMsg("signup", err.message || "Error inesperado. Intenta de nuevo.");
      })
      .then(function () {
        setLoading(form, false);
      });
  }

  function onLogout() {
    var btn = $("#auth-logout");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Cerrando…";
    }
    request("/sign-out", { method: "POST", body: "{}" })
      .then(function () {
        state.user = null;
      })
      .catch(function () {
        state.user = null;
      })
      .then(function () {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Cerrar sesión";
        }
        renderHeader();
        closeModal();
        showView("login");
      });
  }

  /* ---------------------------------------------------------------- init */
  function init() {
    if (!$("#auth-modal")) return;

    var btn = $("#auth-btn");
    if (btn) btn.addEventListener("click", function () { openModal(); });

    var ov = $("#auth-ov");
    if (ov) ov.addEventListener("click", closeModal);

    var x = $("#auth-close");
    if (x) x.addEventListener("click", closeModal);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });

    $$(".auth-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        showView(tab.getAttribute("data-auth-view"));
      });
    });

    var login = $("#auth-view-login");
    if (login) login.addEventListener("submit", onLoginSubmit);

    var signup = $("#auth-view-signup");
    if (signup) signup.addEventListener("submit", onSignupSubmit);

    var logout = $("#auth-logout");
    if (logout) logout.addEventListener("click", onLogout);

    fetchSession()
      .then(function () {
        renderHeader();
      })
      .catch(function () {
        /* sin sesión o backend no disponible: se mantiene "Ingresar" */
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
