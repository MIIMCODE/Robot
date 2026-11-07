'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktopPointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ========================================================================
     ۱. بارگذاری ایمن آیکون‌ها با document.fonts.ready (سازگار با سافاری و کروم)
     ======================================================================== */
  const revealIcons = () => {
    root.classList.add('icons-ready');
  };

  if (document.fonts && document.fonts.ready) {
    Promise.allSettled([
      document.fonts.load("400 24px 'Material Symbols Rounded'"),
      document.fonts.ready
    ]).then(revealIcons);

    /* تضمین نمایش در تمام مرورگرهای موبایل پس از لود کامل صفحه */
    window.addEventListener(
      'load',
      () => {
        window.setTimeout(revealIcons, 600);
      },
      { once: true }
    );
  } else {
    revealIcons();
  }

  /* ========================================================================
     ۲. نوار پیشرفت اسکرول و لینک فعال منو (بدون بازمحاسبه کل DOM)
     ======================================================================== */
  const progressBar = document.getElementById('scrollProgressBar');
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  const trackedSections = navLinks
    .map((link) => {
      const id = link.getAttribute('href');
      return id && id.startsWith('#') ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  let scrollTicking = false;
  let lastActiveId = '';

  const updateScrollState = () => {
    const scrollTop = window.scrollY || root.scrollTop;
    const maxScroll = Math.max(root.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(scrollTop / maxScroll, 0), 1);

    if (progressBar) {
      progressBar.style.setProperty('--scroll-progress', progress.toFixed(4));
    }

    const marker = scrollTop + window.innerHeight * 0.36;
    let activeId = trackedSections[0] ? trackedSections[0].id : 'hero';

    for (const section of trackedSections) {
      if (section.offsetTop <= marker) {
        activeId = section.id;
      }
    }

    if (activeId !== lastActiveId) {
      lastActiveId = activeId;
      for (const link of navLinks) {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${activeId}`);
      }
    }

    scrollTicking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!scrollTicking) {
        window.requestAnimationFrame(updateScrollState);
        scrollTicking = true;
      }
    },
    { passive: true }
  );

  window.addEventListener('resize', updateScrollState, { passive: true });
  updateScrollState();

  /* ========================================================================
     ۳. ورود تدریجی بخش‌ها هنگام اسکرول + حذف تأخیر پس از ورود برای هاور فوری
     ======================================================================== */
  const revealItems = document.querySelectorAll('.reveal');

  revealItems.forEach((item) => {
    const step = Number(item.dataset.delay || 0);
    item.style.setProperty('--reveal-delay', `${step * 95}ms`);
  });

  const markRevealComplete = (el) => {
    const step = Number(el.dataset.delay || 0);
    el.classList.add('is-visible');
    window.setTimeout(() => {
      el.classList.add('reveal-done');
      el.style.removeProperty('--reveal-delay');
    }, step * 95 + 920);
  };

  if (reducedMotionQuery.matches || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => {
      item.classList.add('is-visible', 'reveal-done');
    });
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            markRevealComplete(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -30px 0px'
      }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  /* ========================================================================
     ۴. پارالاکس ابریشمی و آرام هیرو + نور نرم موس در دسکتاپ
     ======================================================================== */
  const parallaxStage = document.getElementById('parallaxStage');
  const heroSection = document.getElementById('hero');
  const spotlight = document.getElementById('cursorSpotlight');

  let heroInView = true;
  if (heroSection && 'IntersectionObserver' in window) {
    const heroVisObserver = new IntersectionObserver(
      (entries) => {
        heroInView = entries[0].isIntersecting;
      },
      { threshold: 0 }
    );
    heroVisObserver.observe(heroSection);
  }

  let targetPx = 0;
  let targetPy = 0;
  let currentPx = 0;
  let currentPy = 0;

  let targetSpotX = window.innerWidth * 0.5;
  let targetSpotY = window.innerHeight * 0.35;
  let currentSpotX = targetSpotX;
  let currentSpotY = targetSpotY;
  let pointerRaf = null;

  const animatePointerEffects = () => {
    let keepRunning = false;

    /* نرم‌سازی بسیار آرام پارالاکس هیرو */
    if (parallaxStage && heroInView) {
      const dx = targetPx - currentPx;
      const dy = targetPy - currentPy;

      if (Math.abs(dx) > 0.0008 || Math.abs(dy) > 0.0008) {
        currentPx += dx * 0.055;
        currentPy += dy * 0.055;
        parallaxStage.style.setProperty('--px', currentPx.toFixed(4));
        parallaxStage.style.setProperty('--py', currentPy.toFixed(4));
        keepRunning = true;
      }
    }

    /* نرم‌سازی حرکت نور موس فقط روی خودش با GPU */
    if (spotlight && desktopPointerQuery.matches) {
      const sx = targetSpotX - currentSpotX;
      const sy = targetSpotY - currentSpotY;

      if (Math.abs(sx) > 0.25 || Math.abs(sy) > 0.25) {
        currentSpotX += sx * 0.085;
        currentSpotY += sy * 0.085;
        spotlight.style.setProperty('--spot-x', `${currentSpotX.toFixed(1)}px`);
        spotlight.style.setProperty('--spot-y', `${currentSpotY.toFixed(1)}px`);
        keepRunning = true;
      }
    }

    if (keepRunning && !reducedMotionQuery.matches) {
      pointerRaf = window.requestAnimationFrame(animatePointerEffects);
    } else {
      pointerRaf = null;
    }
  };

  const requestPointerTick = () => {
    if (!pointerRaf && !reducedMotionQuery.matches) {
      pointerRaf = window.requestAnimationFrame(animatePointerEffects);
    }
  };

  window.addEventListener(
    'mousemove',
    (event) => {
      if (reducedMotionQuery.matches) return;

      if (desktopPointerQuery.matches && spotlight) {
        spotlight.classList.add('is-active');
        targetSpotX = event.clientX;
        targetSpotY = event.clientY;
      }

      if (heroInView) {
        targetPx = (event.clientX / window.innerWidth - 0.5) * 2;
        targetPy = (event.clientY / window.innerHeight - 0.5) * 2;
      }

      requestPointerTick();
    },
    { passive: true }
  );

  window.addEventListener(
    'mouseleave',
    () => {
      targetPx = 0;
      targetPy = 0;
      if (spotlight) {
        spotlight.classList.remove('is-active');
      }
      requestPointerTick();
    },
    { passive: true }
  );

  /* لمس انگشت در موبایل بدون تداخل با اسکرول عمودی صفحه */
  if (parallaxStage) {
    let touchStartX = 0;
    let touchStartY = 0;

    parallaxStage.addEventListener(
      'touchstart',
      (event) => {
        if (!event.touches.length) return;
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
      },
      { passive: true }
    );

    parallaxStage.addEventListener(
      'touchmove',
      (event) => {
        if (reducedMotionQuery.matches || !event.touches.length) return;
        const touch = event.touches[0];
        const moveX = touch.clientX - touchStartX;
        const moveY = touch.clientY - touchStartY;

        /* فقط در حرکت افقی آرام پارالاکس اعمال شود تا اسکرول عمودی کاملاً روان بماند */
        if (Math.abs(moveX) > Math.abs(moveY)) {
          const rect = parallaxStage.getBoundingClientRect();
          targetPx = Math.max(-0.7, Math.min(0.7, ((touch.clientX - rect.left) / rect.width - 0.5) * 1.4));
          targetPy = 0;
          requestPointerTick();
        }
      },
      { passive: true }
    );

    parallaxStage.addEventListener(
      'touchend',
      () => {
        targetPx = 0;
        targetPy = 0;
        requestPointerTick();
      },
      { passive: true }
    );
  }

  /* ========================================================================
     ۵. گفتگوی انیمیشنی آرام و بدون پرش برای ربات تلگرامی «قاپیدن»
     ======================================================================== */
  const stepUser = document.getElementById('chatStepUser');
  const stepTyping = document.getElementById('chatStepTyping');
  const stepBot = document.getElementById('chatStepBot');
  let chatTimers = [];

  const clearChatTimers = () => {
    chatTimers.forEach((timerId) => window.clearTimeout(timerId));
    chatTimers = [];
  };

  const showStaticChat = () => {
    clearChatTimers();
    if (!stepUser || !stepTyping || !stepBot) return;
    stepUser.classList.add('is-visible');
    stepTyping.classList.remove('is-visible');
    stepBot.classList.add('is-visible');
  };

  const runChatCycle = () => {
    clearChatTimers();
    if (!stepUser || !stepTyping || !stepBot) return;

    if (reducedMotionQuery.matches) {
      showStaticChat();
      return;
    }

    stepUser.classList.remove('is-visible');
    stepTyping.classList.remove('is-visible');
    stepBot.classList.remove('is-visible');

    /* گام اول: ارسال آرام لینک ریلز توسط کاربر */
    chatTimers.push(
      window.setTimeout(() => {
        stepUser.classList.add('is-visible');
      }, 650)
    );

    /* گام دوم: نمایش نرم سه‌نقطه تایپ ربات */
    chatTimers.push(
      window.setTimeout(() => {
        stepTyping.classList.add('is-visible');
      }, 2050)
    );

    /* گام سوم: جایگزینی نرم سه‌نقطه با ویدیوی ریلز و پیام «آماده شد» */
    chatTimers.push(
      window.setTimeout(() => {
        stepTyping.classList.remove('is-visible');
        stepBot.classList.add('is-visible');
      }, 4100)
    );

    /* گام چهارم: مکث طولانی و آرام پیش از شروع چرخه بعدی */
    chatTimers.push(
      window.setTimeout(() => {
        stepUser.classList.remove('is-visible');
        stepBot.classList.remove('is-visible');
      }, 9200)
    );

    chatTimers.push(
      window.setTimeout(() => {
        runChatCycle();
      }, 10100)
    );
  };

  runChatCycle();

  /* توقف تایمر هنگام مخفی بودن تب مرورگر و شروع تمیز هنگام بازگشت */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearChatTimers();
    } else {
      runChatCycle();
    }
  });

  reducedMotionQuery.addEventListener('change', (event) => {
    if (event.matches) {
      if (parallaxStage) {
        parallaxStage.style.setProperty('--px', '0');
        parallaxStage.style.setProperty('--py', '0');
      }
      revealItems.forEach((item) => item.classList.add('is-visible', 'reveal-done'));
      showStaticChat();
    } else {
      runChatCycle();
    }
  });
});
