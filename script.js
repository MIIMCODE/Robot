'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktopPointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ========================================================================
     ۱. بارگذاری ایمن فونت آیکون‌ها (جلوگیری از نمایش متن انگلیسی آیکون)
     ======================================================================== */
  const revealIconsIfLoaded = () => {
    if (root.classList.contains('icons-ready')) return;
    if (!document.fonts || !document.fonts.ready) {
      root.classList.add('icons-ready');
      return;
    }

    Promise.all([
      document.fonts.load("400 24px 'Material Symbols Rounded'"),
      document.fonts.ready
    ])
      .then(([loadedFaces]) => {
        if ((loadedFaces && loadedFaces.length > 0) || document.fonts.check("24px 'Material Symbols Rounded'")) {
          root.classList.add('icons-ready');
        }
      })
      .catch(() => {
        /* در صورت عدم دسترسی به اینترنت، متن خام آیکون‌ها مخفی می‌ماند */
      });
  };

  revealIconsIfLoaded();
  window.addEventListener('load', revealIconsIfLoaded, { once: true });
  if (document.fonts && document.fonts.addEventListener) {
    document.fonts.addEventListener('loadingdone', revealIconsIfLoaded);
  }

  /* ========================================================================
     ۲. نوار پیشرفت اسکرول بالای صفحه و لینک فعال منو
     ======================================================================== */
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  const trackedSections = navLinks
    .map((link) => {
      const id = link.getAttribute('href');
      return id && id.startsWith('#') ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  let scrollTicking = false;

  const updateScrollState = () => {
    const scrollTop = window.scrollY || root.scrollTop;
    const maxScroll = Math.max(root.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(scrollTop / maxScroll, 0), 1);

    root.style.setProperty('--scroll-progress', progress.toFixed(4));

    /* تشخیص بخش فعلی برای هایلایت منو */
    const marker = scrollTop + window.innerHeight * 0.35;
    let activeId = trackedSections[0] ? trackedSections[0].id : 'hero';

    for (const section of trackedSections) {
      if (section.offsetTop <= marker) {
        activeId = section.id;
      }
    }

    for (const link of navLinks) {
      const isCurrent = link.getAttribute('href') === `#${activeId}`;
      link.classList.toggle('is-active', isCurrent);
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
     ۳. ورود تدریجی بخش‌ها هنگام اسکرول با تأخیر پله‌ای (IntersectionObserver)
     ======================================================================== */
  const revealItems = document.querySelectorAll('.reveal');

  revealItems.forEach((item) => {
    const step = Number(item.dataset.delay || 0);
    item.style.setProperty('--reveal-delay', `${step * 115}ms`);
  });

  if (reducedMotionQuery.matches || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.14,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  /* ========================================================================
     ۴. پارالاکس عمق هیرو (موس و لمس انگشت) + نور دنبال‌کننده موس (دسکتاپ)
     ======================================================================== */
  const parallaxStage = document.getElementById('parallaxStage');
  const spotlight = document.querySelector('.cursor-spotlight');

  let targetPx = 0;
  let targetPy = 0;
  let currentPx = 0;
  let currentPy = 0;
  let parallaxRaf = null;

  const animateParallax = () => {
    currentPx += (targetPx - currentPx) * 0.12;
    currentPy += (targetPy - currentPy) * 0.12;

    root.style.setProperty('--px', currentPx.toFixed(4));
    root.style.setProperty('--py', currentPy.toFixed(4));

    if (Math.abs(targetPx - currentPx) > 0.001 || Math.abs(targetPy - currentPy) > 0.001) {
      parallaxRaf = window.requestAnimationFrame(animateParallax);
    } else {
      parallaxRaf = null;
    }
  };

  const scheduleParallax = (nx, ny) => {
    if (reducedMotionQuery.matches) return;
    targetPx = Math.max(-1, Math.min(1, nx));
    targetPy = Math.max(-1, Math.min(1, ny));

    if (!parallaxRaf) {
      parallaxRaf = window.requestAnimationFrame(animateParallax);
    }
  };

  /* حرکت موس برای پارالاکس و نور دسکتاپ */
  window.addEventListener(
    'mousemove',
    (event) => {
      if (reducedMotionQuery.matches) return;

      if (desktopPointerQuery.matches && spotlight) {
        spotlight.classList.add('is-active');
        root.style.setProperty('--spot-x', `${event.clientX}px`);
        root.style.setProperty('--spot-y', `${event.clientY}px`);
      }

      const nx = (event.clientX / window.innerWidth - 0.5) * 2;
      const ny = (event.clientY / window.innerHeight - 0.5) * 2;
      scheduleParallax(nx, ny);
    },
    { passive: true }
  );

  window.addEventListener(
    'mouseleave',
    () => {
      scheduleParallax(0, 0);
      if (spotlight) {
        spotlight.classList.remove('is-active');
      }
    },
    { passive: true }
  );

  /* حرکت انگشت روی بخش هیرو در موبایل و تبلت */
  if (parallaxStage) {
    parallaxStage.addEventListener(
      'touchmove',
      (event) => {
        if (reducedMotionQuery.matches || !event.touches.length) return;
        const touch = event.touches[0];
        const rect = parallaxStage.getBoundingClientRect();
        const nx = ((touch.clientX - rect.left) / rect.width - 0.5) * 2;
        const ny = ((touch.clientY - rect.top) / rect.height - 0.5) * 2;
        scheduleParallax(nx, ny);
      },
      { passive: true }
    );

    parallaxStage.addEventListener(
      'touchend',
      () => {
        scheduleParallax(0, 0);
      },
      { passive: true }
    );
  }

  /* ========================================================================
     ۵. گفتگوی انیمیشنی تکرارشونده ربات تلگرامی «قاپیدن»
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

    /* بازنشانی وضعیت ابتدای چرخه */
    stepUser.classList.remove('is-visible');
    stepTyping.classList.remove('is-visible');
    stepBot.classList.remove('is-visible');

    /* گام اول: کاربر لینک ریلز اینستاگرام را ارسال می‌کند */
    chatTimers.push(
      window.setTimeout(() => {
        stepUser.classList.add('is-visible');
      }, 450)
    );

    /* گام دوم: نمایش سه‌نقطه تایپ و پردازش ربات */
    chatTimers.push(
      window.setTimeout(() => {
        stepTyping.classList.add('is-visible');
      }, 1550)
    );

    /* گام سوم: ارسال ویدیوی ریلز با پیام «آماده شد» */
    chatTimers.push(
      window.setTimeout(() => {
        stepTyping.classList.remove('is-visible');
        stepBot.classList.add('is-visible');
      }, 3150)
    );

    /* گام چهارم: مکث برای مشاهده و تکرار نرم گفتگو */
    chatTimers.push(
      window.setTimeout(() => {
        runChatCycle();
      }, 7400)
    );
  };

  runChatCycle();

  /* واکنش زنده به تغییر تنظیمات حرکت سیستم کاربر */
  reducedMotionQuery.addEventListener('change', (event) => {
    if (event.matches) {
      root.style.setProperty('--px', '0');
      root.style.setProperty('--py', '0');
      revealItems.forEach((item) => item.classList.add('is-visible'));
      showStaticChat();
    } else {
      runChatCycle();
    }
  });
});
