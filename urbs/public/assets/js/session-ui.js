document.addEventListener("DOMContentLoaded", async () => {
  const nav = document.querySelector(".app-header nav, .header .nav");
  if (!nav || !window.UrbsAPI) return;

  const ROLE_LABELS = {
    citizen: "Cidadão",
    resolver: "Solucionador",
    master: "Master",
  };

  function rememberAccount(user) {
    if (!user || !user.id) return;
    try {
      const key = "urbs:saved_accounts";
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      const entry = {
        id: Number(user.id),
        name: user.name || "Usuário",
        email: user.email || "",
        role: user.role || "citizen",
        company_name: user.company_name || null,
      };
      const idx = list.findIndex(
        (item) => item.id === entry.id || (entry.email && item.email === entry.email)
      );
      if (idx >= 0) list[idx] = entry;
      else list.unshift(entry);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 6)));
    } catch (_) {}
  }

  try {
    const session = await window.UrbsAPI.session();
    if (!session.authenticated || !session.user) return;

    const user = session.user;
    rememberAccount(user);

    // Atualiza o link "Entrar" para "Trocar conta"
    const loginLink = nav.querySelector('a[href="login.html"]');
    if (loginLink) {
      loginLink.href = "login.html?trocar=1";
      loginLink.textContent = "Trocar conta";
      loginLink.title = "Alternar para outra conta";
    }

    // Exibe identificação discreta do usuário e papel
    const firstName = (user.name || "Conta").split(" ")[0];
    const roleLabel =
      user.role === "resolver" && user.company_name
        ? user.company_name
        : ROLE_LABELS[user.role] || "Cidadão";

    const badge = document.createElement("span");
    badge.className = "session-user-tag";
    badge.textContent = `${firstName} · ${roleLabel}`;
    badge.style.cssText =
      "padding:5px 10px;border:1px solid rgba(199,243,107,.4);border-radius:999px;color:#c7f36b;font-size:10px;font-weight:700;white-space:nowrap;";
    nav.append(badge);

    // Botão Sair
    const logout = document.createElement("a");
    logout.href = "#sair";
    logout.textContent = "Sair";
    logout.setAttribute("aria-label", `Sair da conta de ${user.name}`);
    logout.addEventListener("click", async (event) => {
      event.preventDefault();
      logout.setAttribute("aria-busy", "true");
      try {
        await window.UrbsAPI.logout();
        window.location.assign("login.html");
      } catch (error) {
        logout.removeAttribute("aria-busy");
        window.alert(error.message);
      }
    });
    nav.append(logout);
  } catch (error) {
    console.warn("Não foi possível consultar a sessão do URBS.", error.message);
  }
});