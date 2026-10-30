/* CFP static catalogue: navigation, hero gestures, product categories, artwork and documents. */
document.addEventListener('DOMContentLoaded', () => {
  const hamburgerToggle = document.getElementById('hamburgerToggle');
  const navDrawer = document.getElementById('navDrawer');
  const closeNavBtn = document.getElementById('closeNavBtn');
  const drawerOverlay = document.getElementById('drawerOverlay');

  function openDrawer() {
    if (navDrawer) navDrawer.classList.add('active');
    if (drawerOverlay) drawerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (navDrawer) navDrawer.classList.remove('active');
    if (drawerOverlay) drawerOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (hamburgerToggle) hamburgerToggle.addEventListener('click', openDrawer);
  if (closeNavBtn) closeNavBtn.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

  /* --------------------------------------------------------------------------
     3. HOMEPAGE 3-SLIDE HERO CAROUSEL
     -------------------------------------------------------------------------- */
  const carouselTrack = document.getElementById('carouselTrack');
  const prevSlideBtn = document.getElementById('prevSlideBtn');
  const nextSlideBtn = document.getElementById('nextSlideBtn');
  const dotBtns = document.querySelectorAll('.dot-btn');

  if (carouselTrack) {
    let currentSlide = 0;
    const totalSlides = 3;
    let autoTimer = null;

    function goToSlide(index) {
      if (index < 0) currentSlide = totalSlides - 1;
      else if (index >= totalSlides) currentSlide = 0;
      else currentSlide = index;

      carouselTrack.style.transform = `translateX(-${currentSlide * 33.3333}%)`;

      dotBtns.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentSlide);
      });
    }

    function startAutoSlide() {
      stopAutoSlide();
      autoTimer = setInterval(() => goToSlide(currentSlide + 1), 5000);
    }

    function stopAutoSlide() {
      if (autoTimer) clearInterval(autoTimer);
    }

    if (prevSlideBtn) prevSlideBtn.addEventListener('click', () => { goToSlide(currentSlide - 1); startAutoSlide(); });
    if (nextSlideBtn) nextSlideBtn.addEventListener('click', () => { goToSlide(currentSlide + 1); startAutoSlide(); });

    dotBtns.forEach(dot => {
      dot.addEventListener('click', () => {
        const slideIndex = parseInt(dot.getAttribute('data-slide'), 10);
        goToSlide(slideIndex);
        startAutoSlide();
      });
    });

    // Pointer events support fingers, pens and mouse dragging through the same path.
    const swipeSurface = carouselTrack.parentElement;
    let swipe = null;
    let suppressClickUntil = 0;

    function finishSwipe(event, cancelled = false) {
      if (!swipe || (event && event.pointerId !== swipe.id)) return;
      const gesture = swipe;
      swipe = null;
      carouselTrack.style.removeProperty('transition');
      const dx = event ? event.clientX - gesture.x : 0;
      const dy = event ? event.clientY - gesture.y : 0;
      const threshold = Math.min(80, Math.max(40, swipeSurface.clientWidth * 0.12));
      const advance = !cancelled && gesture.horizontal && Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.2;
      goToSlide(currentSlide + (advance ? (dx < 0 ? 1 : -1) : 0));
      if (gesture.horizontal) suppressClickUntil = Date.now() + 350;
      if (swipeSurface.hasPointerCapture(gesture.id)) swipeSurface.releasePointerCapture(gesture.id);
      startAutoSlide();
    }

    swipeSurface.addEventListener('pointerdown', event => {
      if (!event.isPrimary) { finishSwipe(null, true); return; }
      if (event.button !== 0 || event.target.closest('button')) return;
      suppressClickUntil = 0;
      swipe = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false };
      stopAutoSlide();
    });
    swipeSurface.addEventListener('pointermove', event => {
      if (!swipe || event.pointerId !== swipe.id) return;
      const dx = event.clientX - swipe.x;
      const dy = event.clientY - swipe.y;
      if (!swipe.horizontal) {
        // Leave vertical gestures to the browser's normal page scrolling.
        if (Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) { finishSwipe(event, true); return; }
        if (Math.abs(dx) <= 8 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
        swipe.horizontal = true;
        swipeSurface.setPointerCapture(event.pointerId);
      }
      carouselTrack.style.transition = 'none';
      const offset = Math.max(-swipeSurface.clientWidth, Math.min(swipeSurface.clientWidth, dx));
      carouselTrack.style.transform = `translateX(calc(-${currentSlide * 33.3333}% + ${offset}px))`;
    });
    swipeSurface.addEventListener('pointerup', event => finishSwipe(event));
    swipeSurface.addEventListener('pointercancel', event => finishSwipe(event, true));
    swipeSurface.addEventListener('lostpointercapture', event => finishSwipe(event, true));
    swipeSurface.addEventListener('dragstart', event => event.preventDefault());
    swipeSurface.addEventListener('click', event => {
      if (Date.now() >= suppressClickUntil) return;
      suppressClickUntil = 0;
      event.preventDefault();
      event.stopPropagation();
    }, true);

    startAutoSlide();
  }

  /* --------------------------------------------------------------------------
     4. SHOP PAGE CATEGORY SYSTEM & UNIVERSAL EDITORIAL SCENE-WIPE SHOWCASE
     Supports: Crunchies, Bites, Turmeric
     Features:
     - True upward clipping wipe (clip-path inset(100% 0 0 0) to inset(0 0 0 0))
     - Stationary background panel underneath
     - Staggered entrances for product metadata, typography, and pricing
     - Synchronized pagination dots & arrow triggers
     - Debounced wheel, keyboard arrows, and mobile touch gestures
     - Dual-image pop hover on catalog cards
     -------------------------------------------------------------------------- */
  const categoryPills = document.querySelectorAll('.category-pill-btn');
  const goingBackBtn = document.getElementById('goingBackBtn');
  const categoryTitleElem = document.getElementById('currentCategoryTitle');
  const categoryCountElem = document.getElementById('currentCategoryCount');
  const shopProductCards = document.querySelectorAll('.product-item-card');
  const editorialShowcase = document.getElementById('editorialShowcase');

  let activeCategory = 'crunchies';
  let categoryHistory = ['crunchies'];

  // Showcase Controller Object
  let showcaseController = null;

  if (editorialShowcase) {
    const allScenes = Array.from(editorialShowcase.querySelectorAll('.scene-panel'));
    const prevBtn = document.getElementById('showcasePrevBtn');
    const nextBtn = document.getElementById('showcaseNextBtn');
    const dotsContainer = document.getElementById('showcaseDotsContainer');
    const counterElem = document.getElementById('showcaseCounter');

    let currentSceneIndex = 0;
    let isTransitioning = false;

    function getCategoryScenes(cat) {
      return allScenes.filter(scene => scene.getAttribute('data-category') === cat);
    }

    function updateShowcaseUI(catScenes) {
      if (!catScenes || catScenes.length === 0) return;

      if (counterElem) {
        counterElem.textContent = `${currentSceneIndex + 1} / ${catScenes.length}`;
      }

      if (dotsContainer) {
        dotsContainer.innerHTML = '';
        catScenes.forEach((_, idx) => {
          const dot = document.createElement('button');
          dot.className = `showcase-dot-indicator ${idx === currentSceneIndex ? 'active' : ''}`;
          dot.setAttribute('aria-label', `Go to scene ${idx + 1}`);
          dot.addEventListener('click', (e) => {
            e.stopPropagation();
            if (idx > currentSceneIndex) {
              goToScene(idx, 'down');
            } else if (idx < currentSceneIndex) {
              goToScene(idx, 'up');
            }
          });
          dotsContainer.appendChild(dot);
        });
      }
    }

    function goToScene(targetIndex, direction = 'down') {
      if (isTransitioning) return;
      const catScenes = getCategoryScenes(activeCategory);
      if (catScenes.length <= 1) return;

      if (targetIndex < 0) targetIndex = catScenes.length - 1;
      else if (targetIndex >= catScenes.length) targetIndex = 0;

      if (targetIndex === currentSceneIndex) return;

      isTransitioning = true;
      const currentScene = catScenes[currentSceneIndex];
      const incomingScene = catScenes[targetIndex];

      // 1. Current scene remains stationary in background
      currentScene.className = 'scene-panel scene-stationary';

      // 2. Incoming scene wipes over current scene
      const wipeClass = direction === 'down' ? 'is-wiping-up' : 'is-wiping-down';
      incomingScene.className = `scene-panel ${wipeClass}`;

      void incomingScene.offsetWidth; // Force reflow

      // 3. Complete transition after animation
      setTimeout(() => {
        catScenes.forEach((s, i) => {
          if (i === targetIndex) {
            s.className = 'scene-panel scene-active';
          } else {
            s.className = 'scene-panel';
          }
        });
        currentSceneIndex = targetIndex;
        updateShowcaseUI(catScenes);
        isTransitioning = false;
      }, 660);
    }

    function switchShowcaseCategory(cat) {
      const catScenes = getCategoryScenes(cat);
      currentSceneIndex = 0;
      isTransitioning = false;

      allScenes.forEach(scene => {
        scene.className = 'scene-panel';
      });

      if (catScenes.length > 0) {
        catScenes[0].className = 'scene-panel scene-active';
      }

      updateShowcaseUI(catScenes);
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        goToScene(currentSceneIndex + 1, 'down');
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        goToScene(currentSceneIndex - 1, 'up');
      });
    }

    // Wheel Scroll on Contained Showcase (Debounced, non-scroll-locking)
    let wheelDebounceTimer = null;
    let wheelDeltaAccum = 0;
    editorialShowcase.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > 28) {
        wheelDeltaAccum += e.deltaY;
        if (!wheelDebounceTimer && !isTransitioning) {
          if (wheelDeltaAccum > 35) {
            goToScene(currentSceneIndex + 1, 'down');
            wheelDeltaAccum = 0;
          } else if (wheelDeltaAccum < -35) {
            goToScene(currentSceneIndex - 1, 'up');
            wheelDeltaAccum = 0;
          }
          wheelDebounceTimer = setTimeout(() => {
            wheelDebounceTimer = null;
            wheelDeltaAccum = 0;
          }, 550);
        }
      }
    }, { passive: true });

    // Keyboard Arrow Navigation
    editorialShowcase.setAttribute('tabindex', '0');
    editorialShowcase.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        goToScene(currentSceneIndex + 1, 'down');
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goToScene(currentSceneIndex - 1, 'up');
      }
    });

    // Mobile Touch Gesture Support
    let touchYStart = 0;
    editorialShowcase.addEventListener('touchstart', (e) => {
      touchYStart = e.touches[0].clientY;
    }, { passive: true });

    editorialShowcase.addEventListener('touchend', (e) => {
      const touchYEnd = e.changedTouches[0].clientY;
      const swipeDistance = touchYStart - touchYEnd;
      if (Math.abs(swipeDistance) > 45) {
        if (swipeDistance > 0) goToScene(currentSceneIndex + 1, 'down');
        else goToScene(currentSceneIndex - 1, 'up');
      }
    }, { passive: true });

    showcaseController = {
      switchCategory: switchShowcaseCategory,
      goToScene: goToScene
    };

    // Initial setup
    switchShowcaseCategory(activeCategory);
  }

  function setCategory(category, pushHistory = true) {
    activeCategory = category;
    document.getElementById('shopProductsGrid')?.setAttribute('data-category', category);
    if (pushHistory && categoryHistory[categoryHistory.length - 1] !== category) {
      categoryHistory.push(category);
    }

    // Update pill buttons
    categoryPills.forEach(pill => {
      const pillCat = pill.getAttribute('data-category');
      pill.classList.toggle('active', pillCat === category);
    });

    // Update title & visible grid cards
    let visibleCount = 0;
    shopProductCards.forEach(card => {
      const cardCategory = card.getAttribute('data-category');
      if (cardCategory === category) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
        card.classList.remove('is-popped');
      }
    });

    if (categoryTitleElem) {
      categoryTitleElem.textContent = category.toUpperCase();
    }
    if (categoryCountElem) {
      categoryCountElem.textContent = `${visibleCount} Products`;
    }

    // Synchronize Editorial Showcase
    if (showcaseController) {
      showcaseController.switchCategory(category);
    }
  }

  if (categoryPills.length > 0) {
    categoryPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const cat = pill.getAttribute('data-category');
        if (cat) setCategory(cat);
      });
    });

    const urlParams = new URLSearchParams(window.location.search);
    const catParam = urlParams.get('category') || window.location.hash.replace('#', '');
    if (catParam && ['crunchies', 'bites', 'turmeric'].includes(catParam.toLowerCase())) {
      setCategory(catParam.toLowerCase());
    } else {
      setCategory('crunchies');
    }
  }

  // "Going Back" Button functionality
  if (goingBackBtn) {
    goingBackBtn.addEventListener('click', () => {
      if (categoryHistory.length > 1) {
        categoryHistory.pop();
        const prevCategory = categoryHistory[categoryHistory.length - 1] || 'crunchies';
        setCategory(prevCategory, false);
      } else {
        setCategory('crunchies', false);
        window.scrollTo({ top: 120, behavior: 'smooth' });
      }
    });
  }

  /* --------------------------------------------------------------------------
     4B. PRODUCT CARD HOVER POP ANIMATION (FOR ALL CATALOG CARDS)
     - Default image static underneath
     - POP image triggers two-phase overshoot pop sequence
     - JS mouseenter / mouseleave with force reflow restart
     - Mobile friendly tap support
     -------------------------------------------------------------------------- */
  shopProductCards.forEach(card => {
    const popImg = card.querySelector('.pop-product-img');
    if (!popImg) return;

    card.addEventListener('mouseenter', () => {
      card.classList.remove('is-popped');
      void card.offsetWidth;
      card.classList.add('is-popped');
    });

    card.addEventListener('mouseleave', () => {
      card.classList.remove('is-popped');
    });

    card.addEventListener('touchstart', (e) => {
      const isAlreadyPopped = card.classList.contains('is-popped');
      if (!isAlreadyPopped) {
        if (e.target.closest('a, button')) {
          return;
        }
        shopProductCards.forEach(c => c.classList.remove('is-popped'));
        void card.offsetWidth;
        card.classList.add('is-popped');
      }
    }, { passive: true });
  });

  document.addEventListener('touchstart', (e) => {
    if (!e.target.closest('.product-item-card')) {
      shopProductCards.forEach(c => c.classList.remove('is-popped'));
    }
  }, { passive: true });

  /* --------------------------------------------------------------------------
     8. TOAST NOTIFICATIONS
     -------------------------------------------------------------------------- */
  function showToast(message) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /* --------------------------------------------------------------------------
     9. DOCUMENT & CATALOGUE PDF REGISTRY & CONTROLLER
     Centralized configuration for legal registrations and product catalogues.
     Easily toggle `available: true` once the corresponding PDF is uploaded.
     -------------------------------------------------------------------------- */
  const CFP_DOC_REGISTRY = {
    documents: {
      gst: {
        path: 'assets/documents/gst-registration.pdf',
        available: true,
        title: 'GST Registration'
      },
      fssai: {
        path: 'assets/documents/fssai-licence.pdf',
        available: true,
        title: 'FSSAI Licence'
      },
      iec: {
        path: 'assets/documents/iec-certificate.pdf',
        available: true,
        title: 'Importer Exporter Code (IEC)'
      },
      msme: {
        path: 'assets/documents/msme-registration.pdf',
        available: true,
        title: 'MSME Registration'
      }
    },
    catalogues: {
      crunchies: {
        path: 'assets/catalogues/Crunchies%20catalogue_Digital%20Copy.pdf',
        available: true,
        title: 'Crunchies Catalogue'
      },
      bites: {
        path: 'assets/catalogues/Bites%20Catalogue_Digital%20Copy.pdf',
        available: true,
        title: 'Bites Catalogue'
      },
      turmeric: {
        path: 'assets/catalogues/turmeric-catalogue.pdf',
        available: false, // Set to true once turmeric-catalogue.pdf is uploaded
        title: 'Turmeric Catalogue'
      }
    }
  };

  // Wire Document Cards on About Page
  const docCards = document.querySelectorAll('.doc-card[data-doc]');
  docCards.forEach(card => {
    const docKey = card.getAttribute('data-doc');
    const docInfo = CFP_DOC_REGISTRY.documents[docKey];
    const badge = card.querySelector('.doc-status-badge');

    if (docInfo && docInfo.available) {
      card.classList.remove('disabled');
      card.setAttribute('href', docInfo.path);
      card.removeAttribute('aria-disabled');
      if (badge) {
        badge.textContent = 'Available';
        badge.classList.remove('coming-soon');
      }
    } else {
      card.classList.add('disabled');
      card.setAttribute('aria-disabled', 'true');
      if (badge) {
        badge.textContent = 'Coming Soon';
        badge.classList.add('coming-soon');
      }
      card.addEventListener('click', (e) => {
        e.preventDefault();
        showToast(`${docInfo ? docInfo.title : 'Document'} will be available soon.`);
      });
    }
  });

  // Wire Catalogue Cards on Catalogues Page
  const catalogueButtons = document.querySelectorAll('.catalogue-cta-btn[data-cat]');
  catalogueButtons.forEach(btn => {
    const catKey = btn.getAttribute('data-cat');
    const catInfo = CFP_DOC_REGISTRY.catalogues[catKey];
    const card = btn.closest('.catalogue-card');
    const badge = card ? card.querySelector('.doc-status-badge') : null;

    if (catInfo && catInfo.available) {
      btn.classList.remove('disabled');
      btn.setAttribute('href', catInfo.path);
      btn.removeAttribute('aria-disabled');
      if (badge) {
        badge.textContent = 'Available';
        badge.classList.remove('coming-soon');
      }
    } else {
      btn.classList.add('disabled');
      btn.setAttribute('aria-disabled', 'true');
      if (badge) {
        badge.textContent = 'Coming Soon';
        badge.classList.add('coming-soon');
      }
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        showToast(`${catInfo ? catInfo.title : 'Catalogue'} will be available soon.`);
      });
    }
  });

  /* --------------------------------------------------------------------------
     14. POWER OF MILLETS: CIRCULAR 3D FLIP MARQUEE CONTROLLER
     - Touch & keyboard (Enter/Space) toggle for 3D flip cards
     - Pauses marquee animation while any card is flipped
     - Accessibility state updates (aria-pressed)
     -------------------------------------------------------------------------- */
  const pomViewport = document.getElementById('pomCarouselViewport');
  const pomFlipCards = document.querySelectorAll('.pom-flip-card');

  if (pomFlipCards.length > 0) {
    const checkAnyFlipped = () => {
      if (!pomViewport) return;
      const hasFlipped = pomViewport.querySelector('.pom-flip-card.is-flipped');
      pomViewport.classList.toggle('is-paused', Boolean(hasFlipped));
    };

    pomFlipCards.forEach(card => {
      // Toggle flip helper
      const toggleFlip = () => {
        const isFlipped = card.classList.toggle('is-flipped');
        card.setAttribute('aria-pressed', isFlipped ? 'true' : 'false');
        checkAnyFlipped();
      };

      // Click / tap toggle
      card.addEventListener('click', (e) => {
        // Prevent toggle if clicking on an interactive link inside card if any
        if (e.target.closest('a')) return;
        toggleFlip();
      });

      // Keyboard activation via Enter or Space
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleFlip();
        }
      });
    });
  }

  /* --------------------------------------------------------------------------
     15. POWER OF MILLETS: ANIMATED EDITORIAL ANNOTATIONS
     - Driven by clock variable t (seconds since visible)
     - Sequence:
         0: High Dietary Fibre (Left Top)
         1: Plant-Based Protein (Left Bottom)
         2: Glycemic Response (Right Top)
         3: Naturally Gluten-Free Grains (Right Bottom)
     - t0 = 0.4 + n * 0.75
     - Native SVG paths, rings & dots
     - Easing functions: smooth(x), expoOut(x)
     - Frame delta capped at 0.05s
     - Hold 2.5s -> fade out 0.5s -> loop restart
     - Replay trigger on click
     - IntersectionObserver threshold 0.35
     - ResizeObserver dynamic geometry
     - prefers-reduced-motion support
     -------------------------------------------------------------------------- */
  const pomSection = document.getElementById('pomNutrition');
  const pomStage = document.getElementById('pomAnnotationStage');
  const pomSvg = document.getElementById('pomAnnotationSvg');
  const pomReplayBtn = document.getElementById('pomReplayBtn');
  const pomCenterCard = document.getElementById('pomCenterCard');
  const pomBlocks = [
    document.getElementById('pomBlock0'),
    document.getElementById('pomBlock1'),
    document.getElementById('pomBlock2'),
    document.getElementById('pomBlock3')
  ];

  if (pomSection && pomStage && pomSvg && pomCenterCard && pomBlocks.every(Boolean)) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Helper math functions
    function clamp(val, min, max) {
      return Math.min(max, Math.max(min, val));
    }
    function smooth(x) {
      const c = clamp(x, 0, 1);
      return c * c * (3 - 2 * c);
    }
    function expoOut(x) {
      const c = clamp(x, 0, 1);
      if (c <= 0) return 0;
      return 1 - Math.pow(2, -10 * c);
    }

    // Build SVG annotation elements
    const annotElements = pomBlocks.map((_, i) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'pom-annot-group');
      g.setAttribute('data-index', String(i));

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'pom-leader-line');

      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('class', 'pom-anchor-ring');
      ring.setAttribute('r', '3');

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('class', 'pom-anchor-dot');
      dot.setAttribute('r', '2.1');

      g.appendChild(path);
      g.appendChild(ring);
      g.appendChild(dot);
      pomSvg.appendChild(g);

      return { g, path, ring, dot, length: 100 };
    });

    // Dynamic geometry recalculation
    function updateGeometry() {
      const stageRect = pomStage.getBoundingClientRect();
      if (stageRect.width === 0 || stageRect.height === 0) return;

      pomSvg.setAttribute('viewBox', `0 0 ${stageRect.width} ${stageRect.height}`);
      pomSvg.setAttribute('width', String(stageRect.width));
      pomSvg.setAttribute('height', String(stageRect.height));

      const cardRect = pomCenterCard.getBoundingClientRect();
      const isDesktop = stageRect.width >= 768;

      pomBlocks.forEach((blockEl, i) => {
        const blockRect = blockEl.getBoundingClientRect();
        const titleEl = blockEl.querySelector('.pom-feature-title') || blockEl;
        const titleRect = titleEl.getBoundingClientRect();
        const item = annotElements[i];

        let anchorX, anchorY, lineStartX, lineEndX, lineY;

        if (isDesktop) {
          lineY = Math.round(titleRect.top - stageRect.top + titleRect.height * 0.45);
          if (i === 0 || i === 1) {
            // Left blocks: anchor to the right of text, line draws to card left edge
            const xBlockRight = titleRect.right - stageRect.left;
            const xCardLeft = cardRect.left - stageRect.left;
            anchorX = Math.round(xBlockRight + 16);
            anchorY = lineY;
            lineStartX = anchorX + 11;
            lineEndX = Math.max(lineStartX + 10, Math.round(xCardLeft - 10));
          } else {
            // Right blocks: anchor to the left of text with generous clearance, line draws left to card right edge
            const xBlockLeft = titleRect.left - stageRect.left;
            const xCardRight = cardRect.right - stageRect.left;
            anchorX = Math.round(xBlockLeft - 24);
            anchorY = lineY;
            lineStartX = anchorX - 11;
            lineEndX = Math.min(lineStartX - 10, Math.round(xCardRight + 10));
          }
        } else {
          // Mobile stacked layout
          anchorX = Math.round(blockRect.left - stageRect.left + 10);
          anchorY = Math.round(titleRect.top - stageRect.top + titleRect.height * 0.5);
          lineStartX = anchorX + 11;
          lineEndX = anchorX + 44;
          lineY = anchorY;
        }

        item.ring.setAttribute('cx', String(anchorX));
        item.ring.setAttribute('cy', String(anchorY));
        item.dot.setAttribute('cx', String(anchorX));
        item.dot.setAttribute('cy', String(anchorY));

        const d = `M ${lineStartX} ${lineY} L ${lineEndX} ${lineY}`;
        item.path.setAttribute('d', d);

        const totalLen = Math.max(1, item.path.getTotalLength());
        item.length = totalLen;
        item.path.style.strokeDasharray = `${totalLen} ${totalLen}`;
      });
    }

    // Animation state
    let t = 0;
    let isAnimating = false;
    let lastFrameTime = performance.now();

    // Render single frame at time t (plays once through and settles)
    function render(timeVal) {
      pomBlocks.forEach((blockEl, n) => {
        const t0 = 0.4 + n * 0.75;
        const item = annotElements[n];
        const isLeft = (n === 0 || n === 1);

        // 1. Anchor marker (ring radius 3px -> 5.5px over 0.5s from t0)
        const ringTime = clamp((timeVal - t0) / 0.5, 0, 1);
        const ringRadius = 3.0 + 2.5 * smooth(ringTime);
        const markerOpacity = smooth(ringTime);

        item.ring.setAttribute('r', ringRadius.toFixed(2));
        item.ring.style.opacity = markerOpacity.toFixed(3);
        item.dot.style.opacity = markerOpacity.toFixed(3);

        // 2. Leader line (draws outward over 0.9s from t0)
        const lineTime = clamp((timeVal - t0) / 0.9, 0, 1);
        const lineProgress = expoOut(lineTime);
        const lineOffset = item.length * (1 - lineProgress);

        item.path.style.strokeDashoffset = lineOffset.toFixed(2);
        item.path.style.opacity = (timeVal >= t0) ? '1' : '0';

        // 3. Information block
        // Fade: 0.55s to 1.30s after t0
        const fadeTime = clamp((timeVal - (t0 + 0.55)) / (1.30 - 0.55), 0, 1);
        const blockOpacity = smooth(fadeTime);

        // Slide: 0.55s to 1.25s after t0 (16px into final position)
        const slideTime = clamp((timeVal - (t0 + 0.55)) / (1.25 - 0.55), 0, 1);
        const slideProgress = expoOut(slideTime);
        const slideOffset = (1 - slideProgress) * (isLeft ? -16 : 16);

        blockEl.style.opacity = blockOpacity.toFixed(3);
        blockEl.style.transform = `translateX(${slideOffset.toFixed(2)}px)`;
      });
    }

    // Tick loop: plays once through, then stops cleanly
    function tick(now) {
      if (!isAnimating) return;

      let dt = (now - lastFrameTime) / 1000;
      lastFrameTime = now;
      if (dt > 0.05) dt = 0.05;

      t += dt;
      if (t >= 4.2) {
        t = 4.2;
        render(4.2);
        isAnimating = false; // Stop! Sequence completes once.
        return;
      }

      render(t);
      requestAnimationFrame(tick);
    }

    // Viewport IntersectionObserver (threshold: 0.35)
    let hasPlayedOnce = false;

    if ('IntersectionObserver' in window) {
      const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            updateGeometry();
            if (prefersReducedMotion || hasPlayedOnce) {
              render(4.2); // fully revealed static state
            } else {
              t = 0;
              lastFrameTime = performance.now();
              isAnimating = true;
              hasPlayedOnce = true;
              requestAnimationFrame(tick);
            }
          } else {
            isAnimating = false;
          }
        });
      }, {
        threshold: 0.35
      });

      sectionObserver.observe(pomSection);
    } else {
      // Fallback
      updateGeometry();
      render(4.2);
    }

    // ResizeObserver
    if ('ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(() => {
        updateGeometry();
        render(t);
      });
      resizeObserver.observe(pomStage);
    } else {
      window.addEventListener('resize', () => {
        updateGeometry();
        render(t);
      });
    }

    // Initial pass
    updateGeometry();
    if (prefersReducedMotion) {
      render(5.0);
    } else {
      render(0);
    }
  }

});

