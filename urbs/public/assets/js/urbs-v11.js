/* URBS — Navegação da Home, carrossel infinito full-bleed com inércia/skew e tipografia cinética */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Menu mobile
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  menu?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  });
  nav?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      menu?.setAttribute('aria-expanded', 'false');
    });
  });

  // 2. Barra de progresso de leitura no topo
  const bar = document.querySelector('.progress span');
  let scheduled = false;
  const onScroll = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, max ? scrollY / max : 0))})`;
      scheduled = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 3. Carrossel Infinito Full-Bleed (#story-viewport) com inércia e inclinação física (skew)
  initStoryCarousel();
  function initStoryCarousel() {
    const section = document.getElementById('categorias');
    const viewport = document.getElementById('story-viewport');
    const track = viewport?.querySelector('.story-track');
    const togglePlayBtn = document.getElementById('story-toggle-play');
    if (!viewport || !track) return;

    const originals = [...track.querySelectorAll('.story-card')];
    if (originals.length < 2) return;

    // Clona 2 conjuntos extras para preencher monitores ultrawide sem nunca aparecer vazio na esquerda ou direita
    for (let copy = 0; copy < 2; copy++) {
      originals.forEach((card) => {
        const clone = card.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.setAttribute('tabindex', '-1');
        track.appendChild(clone);
      });
    }

    const SPEED = 44; // px/s: fluxo contínuo elegante
    let period = 0;
    let offset = 0;
    let previous = 0;
    let frameId = 0;
    let visible = true;
    let manualPaused = false;
    let dragging = false;
    let touching = false;
    let pointerStartX = 0;
    let pointerStartOffset = 0;
    let lastClientX = 0;
    let inertia = 0;
    let currentSkew = 0;
    let moved = false;
    let pauseUntil = 0;

    // Mantém sempre dentro do bloco central [period, 2 * period) para haver cards visíveis à esquerda e à direita
    const keepCentered = (val) => {
      if (!period) return 0;
      let v = val;
      while (v < period) v += period;
      while (v >= period * 2) v -= period;
      return v;
    };

    const measure = () => {
      const first = originals[0];
      const firstDuplicate = track.children[originals.length];
      period = firstDuplicate.offsetLeft - first.offsetLeft;
      if (period > 0) {
        offset = keepCentered(offset || period);
        viewport.scrollLeft = offset;
      }
    };

    const tick = (now) => {
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;

      let targetSkew = 0;

      if (period > 0 && visible && !document.hidden) {
        if (dragging) {
          targetSkew = Math.max(-3.6, Math.min(3.6, inertia * -0.14));
        } else if (Math.abs(inertia) > 0.25) {
          // Deslize suave por inércia após soltar o mouse
          offset = keepCentered(offset - inertia);
          viewport.scrollLeft = offset;
          targetSkew = Math.max(-3.2, Math.min(3.2, inertia * -0.11));
          inertia *= 0.92;
        } else {
          inertia = 0;
          const isPaused =
            reduced ||
            manualPaused ||
            touching ||
            now < pauseUntil ||
            viewport.matches(':hover') ||
            viewport.matches(':focus-within');

          if (!isPaused) {
            offset = keepCentered(offset + SPEED * dt);
            viewport.scrollLeft = offset;
          }
        }
      }

      if (!reduced) {
        currentSkew += (targetSkew - currentSkew) * 0.16;
        if (Math.abs(currentSkew) < 0.01) currentSkew = 0;
        viewport.style.setProperty('--drag-skew', `${currentSkew.toFixed(2)}deg`);
      }

      frameId = requestAnimationFrame(tick);
    };

    // Arraste com mouse + física de inércia
    viewport.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true;
      moved = false;
      inertia = 0;
      pointerStartX = e.clientX;
      lastClientX = e.clientX;
      pointerStartOffset = viewport.scrollLeft;
      offset = pointerStartOffset;
      viewport.classList.add('dragging');
    });

    viewport.addEventListener('pointermove', (e) => {
      if (!dragging || !period) return;
      const dx = e.clientX - pointerStartX;
      const stepDelta = e.clientX - lastClientX;
      lastClientX = e.clientX;
      inertia = stepDelta;
      if (Math.abs(dx) > 5) moved = true;
      if (moved) {
        offset = keepCentered(pointerStartOffset - dx);
        viewport.scrollLeft = offset;
      }
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove('dragging');
      pauseUntil = performance.now() + 900;
      previous = 0;
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    // Toque nativo no celular sem brigar com o loop
    viewport.addEventListener('touchstart', () => {
      touching = true;
      inertia = 0;
      pauseUntil = performance.now() + 2600;
    }, { passive: true });

    viewport.addEventListener('touchend', () => {
      touching = false;
      offset = keepCentered(viewport.scrollLeft);
      viewport.scrollLeft = offset;
      pauseUntil = performance.now() + 2200;
      previous = 0;
    }, { passive: true });

    viewport.addEventListener('scroll', () => {
      if ((touching || performance.now() < pauseUntil) && period > 0) {
        const s = viewport.scrollLeft;
        if (s < period * 0.35 || s > period * 2.4) {
          offset = keepCentered(s);
          viewport.scrollLeft = offset;
        } else {
          offset = s;
        }
      }
    }, { passive: true });

    viewport.addEventListener('click', (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    }, true);

    // Botão Pausar / Retomar
    togglePlayBtn?.addEventListener('click', () => {
      manualPaused = !manualPaused;
      togglePlayBtn.setAttribute('aria-pressed', String(manualPaused));
      togglePlayBtn.textContent = manualPaused ? 'RETOMAR' : 'PAUSAR';
      togglePlayBtn.setAttribute('aria-label', manualPaused ? 'Retomar movimento automático' : 'Pausar movimento automático');
      section?.classList.toggle('is-paused', manualPaused);
      previous = 0;
    });

    // Setas ← e → com deslocamento suave
    const stepCard = (direction) => {
      if (!period) return;
      const step = originals[0].offsetWidth + 20;
      const target = keepCentered(viewport.scrollLeft + direction * step);
      offset = target;
      viewport.scrollTo({ left: target, behavior: reduced ? 'auto' : 'smooth' });
      pauseUntil = performance.now() + 2400;
    };

    document.getElementById('story-prev')?.addEventListener('click', () => stepCard(-1));
    document.getElementById('story-next')?.addEventListener('click', () => stepCard(1));

    viewport.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        stepCard(e.key === 'ArrowRight' ? 1 : -1);
      }
    });

    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        previous = 0;
      }, { threshold: 0.01 })
      : null;
    observer?.observe(viewport);

    const resizer = 'ResizeObserver' in window ? new ResizeObserver(measure) : null;
    resizer?.observe(viewport);
    resizer?.observe(track);
    addEventListener('resize', measure, { passive: true });

    measure();
    frameId = requestAnimationFrame(tick);

    addEventListener('pagehide', () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      resizer?.disconnect();
    }, { once: true });
  }

  // 4. Zoom sutil na foto de Impacto conforme a rolagem
  if (!reduced) {
    const impact = document.querySelector('.impact');
    if (impact) {
      let queued = false;
      const update = () => {
        queued = false;
        const r = impact.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (innerHeight - r.top) / (innerHeight + r.height)));
        impact.style.setProperty('--impact-zoom', (1.12 - progress * 0.12).toFixed(3));
      };
      const request = () => {
        if (!queued) {
          queued = true;
          requestAnimationFrame(update);
        }
      };
      addEventListener('scroll', request, { passive: true });
      addEventListener('resize', request, { passive: true });
      request();
    }
  }

  // 5. Entrada do Hero
  if (window.gsap && !reduced) {
    try {
      if (!document.documentElement.classList.contains('urbs-arrival')) {
        gsap.fromTo('.hero-content', { y: 20 }, { y: 0, duration: 1.2, ease: 'power3.out' });
      }
      gsap.to('.hero-photo', { scale: 1.15, duration: 18, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    } catch (e) {
      console.warn('URBS: animação de abertura indisponível', e);
    }
  }

  // 6. Tipografia cinética nos títulos + dica visual sutil no scroll (desktop com mouse)
  if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const hopLetter = (letter, delay = 0, intensity = 1) => {
      if (window.gsap) {
        gsap.killTweensOf(letter);
        gsap.fromTo(
          letter,
          { y: 0, rotate: 0, scale: 1 },
          {
            y: -13 * intensity,
            rotate: (Math.random() - 0.5) * 11 * intensity,
            scale: 1 + 0.06 * intensity,
            duration: 0.22,
            delay,
            ease: 'power2.out',
            onComplete: () =>
              gsap.to(letter, {
                y: 0,
                rotate: 0,
                scale: 1,
                duration: 0.62,
                ease: 'bounce.out',
                clearProps: 'transform',
              }),
          }
        );
      } else {
        window.setTimeout(() => {
          letter.classList.remove('jump-active');
          void letter.offsetWidth;
          letter.classList.add('jump-active');
        }, delay * 1000);
      }
    };

    const headings = [...document.querySelectorAll('main h1, main h2')];

    headings.forEach((heading) => {
      const label = heading.innerText.replace(/\s+/g, ' ').trim();
      if (!label) return;
      heading.setAttribute('aria-label', label);
      heading.classList.add('title-jump');

      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);

      nodes.forEach((node) => {
        const frag = document.createDocumentFragment();
        const tokens = node.textContent.match(/\s+|\S+/g) || [];
        tokens.forEach((token) => {
          if (/^\s+$/.test(token)) {
            frag.appendChild(document.createTextNode(token));
            return;
          }
          const word = document.createElement('span');
          word.className = 'jump-word';
          word.setAttribute('aria-hidden', 'true');
          for (const ch of token) {
            const letter = document.createElement('span');
            letter.className = 'jump-letter';
            letter.textContent = ch;
            word.appendChild(letter);
          }
          frag.appendChild(word);
        });
        node.replaceWith(frag);
      });

      heading.addEventListener('pointerover', (event) => {
        const letter = event.target.closest('.jump-letter');
        if (!letter || !heading.contains(letter) || letter === event.relatedTarget) return;
        hopLetter(letter, 0, 1);
      });
    });

    // Ao rolar até o título, 3 a 4 letras bem espaçadas dão um pulinho sutil indicando interatividade
    if ('IntersectionObserver' in window) {
      const teaseObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const heading = entry.target;
            teaseObserver.unobserve(heading);

            const letters = [...heading.querySelectorAll('.jump-letter')].filter((el) =>
              /[A-Za-zÀ-ÿ0-9]/.test(el.textContent)
            );
            if (letters.length < 3) return;

            const picksCount = letters.length > 14 ? 4 : 3;
            const step = Math.max(2, Math.floor(letters.length / (picksCount + 1)));
            const chosen = [];
            for (let i = 1; i <= picksCount; i++) {
              const idx = Math.min(letters.length - 1, i * step + (i % 2));
              if (!chosen.includes(letters[idx])) chosen.push(letters[idx]);
            }

            chosen.forEach((letter, idx) => {
              // Hero aguarda a entrada inicial; demais seções dão o pulinho logo ao aparecer
              const baseDelay = heading.id === 'hero-title' ? 0.95 : 0.22;
              hopLetter(letter, baseDelay + idx * 0.13, 0.85);
            });
          });
        },
        { threshold: 0.45 }
      );

      headings.forEach((h) => teaseObserver.observe(h));
    }
  }
})();