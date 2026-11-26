/* URBS — Etapa 1: UX do Login e Cadastro (Selo de destino, Força de senha, Caps Lock e Limpar contas) */
(() => {
  'use strict';

  // 1. Selo de destino preservado via ?next=
  const params = new URLSearchParams(window.location.search);
  const rawNext = (params.get('next') || '').trim();

  if (rawNext && !/^(?:https?:|\/\/|javascript:|data:|\.\.)/i.test(rawNext)) {
    const [rawPage, rawQuery = ''] = rawNext.split('?');
    const page = rawPage.replace(/^\/+/, '').toLowerCase();
    const cat = (new URLSearchParams(rawQuery).get('categoria') || '').trim();

    let badgeLabel = '';
    if (page === 'registro.html') {
      badgeLabel = cat ? `DESTINO · REGISTRAR EM ${cat.toUpperCase()}` : 'DESTINO · NOVO REGISTRO';
    } else if (page === 'mapa.html') {
      badgeLabel = cat ? `DESTINO · MAPA (${cat.toUpperCase()})` : 'DESTINO · MAPA INTERATIVO';
    } else if (page === 'painel.html') {
      badgeLabel = 'DESTINO · PAINEL DE GESTÃO';
    }

    if (badgeLabel) {
      [
        ['auth-dest-badge', 'auth-dest-text'],
        ['auth-dest-badge-reg', 'auth-dest-text-reg'],
      ].forEach(([boxId, textId]) => {
        const box = document.getElementById(boxId);
        const txt = document.getElementById(textId);
        if (box && txt) {
          txt.textContent = badgeLabel;
          box.hidden = false;
        }
      });
    }
  }

  // 2. Medidor de força de senha + validação ao vivo da confirmação (Cadastro)
  const passInput = document.getElementById('register-password');
  const confirmInput = document.getElementById('register-confirm');
  const meter = document.getElementById('pass-meter');
  const meterLabel = document.getElementById('pass-meter-label');
  const confirmHint = document.getElementById('confirm-hint');

  const LEVELS = [
    'FORÇA DA SENHA · AGUARDANDO',
    'FORÇA · FRACA (USE 6+ CARACTERES)',
    'FORÇA · RAZOÁVEL',
    'FORÇA · BOA',
    'FORÇA · EXCELENTE',
  ];

  function evaluateStrength(value) {
    if (!value) return 0;
    let score = 0;
    if (value.length >= 6) score++;
    if (value.length >= 10) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
    else if (/\d/.test(value) && value.length >= 8) score++;
    return Math.min(4, Math.max(1, score));
  }

  function syncConfirmFeedback() {
    if (!passInput || !confirmInput || !confirmHint) return;
    const confirmBox = confirmInput.closest('.field-box');
    const p = passInput.value;
    const c = confirmInput.value;

    if (!c) {
      confirmHint.textContent = '';
      confirmHint.className = 'confirm-hint';
      confirmBox?.classList.remove('is-invalid');
      return;
    }

    if (p === c) {
      confirmHint.textContent = 'SENHAS CONFEREM';
      confirmHint.className = 'confirm-hint is-match';
      confirmBox?.classList.remove('is-invalid');
    } else {
      confirmHint.textContent = 'SENHAS DIFERENTES';
      confirmHint.className = 'confirm-hint is-mismatch';
      confirmBox?.classList.add('is-invalid');
    }
  }

  passInput?.addEventListener('input', () => {
    const level = evaluateStrength(passInput.value);
    if (meter) meter.dataset.level = String(level);
    if (meterLabel) meterLabel.textContent = LEVELS[level];
    syncConfirmFeedback();
  });

  confirmInput?.addEventListener('input', syncConfirmFeedback);

  // 3. Aviso de Caps Lock nos campos de senha
  document.querySelectorAll('input[type="password"]').forEach((input) => {
    const alertEl = document.querySelector(`[data-caps-for="${input.id}"]`);
    if (!alertEl) return;
    const checkCaps = (event) => {
      if (typeof event.getModifierState === 'function') {
        alertEl.hidden = !event.getModifierState('CapsLock');
      }
    };
    input.addEventListener('keyup', checkCaps);
    input.addEventListener('keydown', checkCaps);
    input.addEventListener('blur', () => { alertEl.hidden = true; });
  });

  // 4. Botão de limpar contas recentes salvas no navegador
  document.getElementById('saved-clear-btn')?.addEventListener('click', () => {
    try { localStorage.removeItem('urbs:saved_accounts'); } catch (_) {}
    const box = document.getElementById('saved-accounts');
    const list = document.getElementById('saved-accounts-list');
    if (list) list.replaceChildren();
    if (box) box.hidden = true;
  });
})();