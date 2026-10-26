/* ==========================================================================
   CFP MILLET BITES - UNIVERSAL JAVASCRIPT
   Handles:
   1. Minimal Header Navigation Side Drawer Toggle
   2. Cart State & Persistent Badge Counter (localStorage)
   3. Homepage Hero 3-Slide Carousel
   4. Shop Page Category Filtering & Sorting
   5. Product Details Quantity Picker
   6. Cart Page Rendering & Checkout Flow
   7. Login & Registration Tab Switcher
   8. Toast Notifications
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* --------------------------------------------------------------------------
     1. AUTHORITATIVE PRODUCT CATALOG & CART STATE
     -------------------------------------------------------------------------- */
  const CFP_PRODUCTS = {
    'c1': { id: 'c1', name: 'Ragi Sticks', price: 99 },
    'c2': { id: 'c2', name: 'Bajra Chivda', price: 99 },
    'c3': { id: 'c3', name: 'Jowar Chips', price: 99 },
    'c4': { id: 'c4', name: 'Jowar Chivda', price: 99 },
    'b1': { id: 'b1', name: 'Ragi Ladoo', price: 199 },
    'b2': { id: 'b2', name: 'Millet Ladoo', price: 199 },
    'b3': { id: 'b3', name: 'Millet Cookies', price: 99 },
    'b4': { id: 'b4', name: 'Millet Nutri Bar', price: 49 },
    't1': { id: 't1', name: 'Turmeric Fingers', price: 149 },
    't2': { id: 't2', name: 'Turmeric Powder', price: 99 },
    'p1': { id: 'p1', name: 'Super Millet Chatpata Crunch', price: 149 },
    'p2': { id: 'p2', name: 'Roasted Ragi & Cheese Puffs', price: 129 }
  };

  // Authoritative cart retrieval with validation
  function getCart() {
    try {
      const raw = localStorage.getItem('cfp_cart');
      if (!raw) return []; // Default to genuine empty cart
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const validated = [];
      parsed.forEach(item => {
        if (!item || !item.id) return;
        const catalogItem = CFP_PRODUCTS[item.id];
        const validPrice = catalogItem ? catalogItem.price : (typeof item.price === 'number' && item.price > 0 ? item.price : 0);
        const validName = catalogItem ? catalogItem.name : (item.name || 'Millet Snack');
        const validQty = Math.max(1, parseInt(item.quantity, 10) || 1);

        if (validPrice > 0) {
          validated.push({
            id: item.id,
            name: validName,
            price: validPrice,
            quantity: validQty
          });
        }
      });
      return validated;
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem('cfp_cart', JSON.stringify(cart));
    } catch (e) {}
    updateCartBadge();
  }

  // Authoritative Order Calculation used by both Cart and Checkout
  function calculateOrderSummary(cart) {
    let subtotal = 0;
    const validatedItems = [];

    cart.forEach(item => {
      const catalogItem = CFP_PRODUCTS[item.id];
      const unitPrice = catalogItem ? catalogItem.price : (typeof item.price === 'number' && item.price > 0 ? item.price : 0);
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const itemTotal = unitPrice * qty;
      subtotal += itemTotal;
      validatedItems.push({
        id: item.id,
        name: catalogItem ? catalogItem.name : item.name,
        price: unitPrice,
        quantity: qty,
        itemTotal: itemTotal
      });
    });

    let shipping = 0;
    let shippingText = 'FREE';

    if (subtotal === 0) {
      shipping = 0;
      shippingText = '₹0';
    } else if (subtotal >= 499) {
      shipping = 0;
      shippingText = 'FREE (Orders over ₹499)';
    } else {
      shipping = 50;
      shippingText = '₹50 (Standard Delivery)';
    }

    const total = subtotal + shipping;

    return {
      items: validatedItems,
      subtotal,
      shipping,
      shippingText,
      total
    };
  }

  // Customer Authentication & Greeting Profile Helpers
  function getAuthUser() {
    try {
      const raw = localStorage.getItem('cfp_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setAuthUser(user) {
    try {
      if (user) {
        localStorage.setItem('cfp_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('cfp_user');
      }
    } catch (e) {}
    updateUserGreeting();
    autofillLoggedInUser();
    renderUserAccountDropdown();
    if (typeof renderAccountPage === 'function') {
      renderAccountPage();
    }
  }

  function updateUserGreeting() {
    const greetingElem = document.getElementById('cartUserGreeting');
    if (!greetingElem) return;
    const user = getAuthUser();
    if (user && user.name && user.name.trim()) {
      const firstName = user.name.trim().split(/\s+/)[0];
      greetingElem.textContent = `Hello, ${firstName}`;
    } else {
      greetingElem.textContent = 'Hello there';
    }
  }

  // Automatically autofill customer name & email across checkout, contact, and account forms
  function autofillLoggedInUser() {
    const user = getAuthUser();
    if (!user) return;

    // Checkout form inputs
    const checkoutName = document.getElementById('custFullName');
    const checkoutEmail = document.getElementById('custEmail');
    if (checkoutName && (!checkoutName.value || checkoutName.value.trim() === '')) {
      if (user.name) checkoutName.value = user.name;
    }
    if (checkoutEmail && (!checkoutEmail.value || checkoutEmail.value.trim() === '')) {
      if (user.email) checkoutEmail.value = user.email;
    }

    // Contact form inputs
    const contactName = document.getElementById('contactName');
    const contactEmail = document.getElementById('contactEmail');
    if (contactName && (!contactName.value || contactName.value.trim() === '')) {
      if (user.name) contactName.value = user.name;
    }
    if (contactEmail && (!contactEmail.value || contactEmail.value.trim() === '')) {
      if (user.email) contactEmail.value = user.email;
    }

    // Login page input prefill
    const loginEmail = document.getElementById('loginEmail');
    if (loginEmail && (!loginEmail.value || loginEmail.value.trim() === '')) {
      if (user.email) loginEmail.value = user.email;
    }

    // Autofill default saved address in checkout if available
    try {
      const addrs = getSavedAddresses();
      const defaultAddr = addrs.find(a => a.isDefault) || addrs[0];
      if (defaultAddr) {
        const custPhone = document.getElementById('custPhone');
        const custAddress = document.getElementById('custAddress');
        const custCity = document.getElementById('custCity');
        const custState = document.getElementById('custState');
        const custPincode = document.getElementById('custPincode');

        if (custPhone && (!custPhone.value || custPhone.value.trim() === '') && defaultAddr.phone) {
          custPhone.value = defaultAddr.phone;
        }
        if (custAddress && (!custAddress.value || custAddress.value.trim() === '') && defaultAddr.address) {
          custAddress.value = defaultAddr.address;
        }
        if (custCity && (!custCity.value || custCity.value.trim() === '') && defaultAddr.city) {
          custCity.value = defaultAddr.city;
        }
        if (custState && (!custState.value || custState.value.trim() === '') && defaultAddr.state) {
          custState.value = defaultAddr.state;
        }
        if (custPincode && (!custPincode.value || custPincode.value.trim() === '') && defaultAddr.pincode) {
          custPincode.value = defaultAddr.pincode;
        }
      }
    } catch (e) {}
  }

  /* --------------------------------------------------------------------------
     USER ACCOUNT DROPDOWN & LOGOUT CONTROLLER
     -------------------------------------------------------------------------- */
  let userAccountDropdownElem = null;

  function renderUserAccountDropdown() {
    if (!userAccountDropdownElem) return;
    const user = getAuthUser();
    const accountBtn = document.querySelector('.header-right a[href="login.html"]');

    if (!user) {
      userAccountDropdownElem.innerHTML = '';
      userAccountDropdownElem.classList.remove('active');
      if (accountBtn) accountBtn.setAttribute('title', 'Login / Account');
      return;
    }

    if (accountBtn) accountBtn.setAttribute('title', `Logged in as ${user.name}`);
    const firstName = user.name ? user.name.trim().split(/\s+/)[0] : 'Customer';
    const initial = firstName.charAt(0).toUpperCase();

    userAccountDropdownElem.innerHTML = `
      <div class="user-dropdown-header">
        <div class="user-avatar-badge">${initial}</div>
        <div class="user-dropdown-info">
          <strong class="user-dropdown-name">${user.name}</strong>
          <small class="user-dropdown-email">${user.email || 'Member'}</small>
        </div>
      </div>
      <div class="user-dropdown-divider"></div>
      <a href="login.html" class="user-dropdown-link">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        Account Overview
      </a>
      <button type="button" class="user-dropdown-logout-btn" id="headerLogoutBtn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
        Logout
      </button>
    `;

    const logoutBtn = userAccountDropdownElem.querySelector('#headerLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setAuthUser(null);
        userAccountDropdownElem.classList.remove('active');
        showToast('You have been logged out.');

        // Update greeting on cart page
        updateUserGreeting();

        // Clear active page form inputs if populated
        const checkoutName = document.getElementById('custFullName');
        const checkoutEmail = document.getElementById('custEmail');
        if (checkoutName) checkoutName.value = '';
        if (checkoutEmail) checkoutEmail.value = '';

        const contactName = document.getElementById('contactName');
        const contactEmail = document.getElementById('contactEmail');
        if (contactName) contactName.value = '';
        if (contactEmail) contactEmail.value = '';

        const loginEmail = document.getElementById('loginEmail');
        if (loginEmail) loginEmail.value = '';
      });
    }
  }

  function initUserAccountDropdown() {
    const headerRight = document.querySelector('.header-right');
    const accountBtn = document.querySelector('.header-right a[href="login.html"]');
    if (!headerRight || !accountBtn) return;

    if (!userAccountDropdownElem) {
      userAccountDropdownElem = document.createElement('div');
      userAccountDropdownElem.id = 'userAccountDropdown';
      userAccountDropdownElem.className = 'user-account-dropdown';
      headerRight.appendChild(userAccountDropdownElem);
    }

    renderUserAccountDropdown();

    // Toggle dropdown when clicking account button while logged in
    accountBtn.addEventListener('click', (e) => {
      const user = getAuthUser();
      if (user) {
        e.preventDefault();
        e.stopPropagation();
        renderUserAccountDropdown();
        userAccountDropdownElem.classList.toggle('active');
      }
      // If not logged in, allows normal navigation to login.html
    });

    // Dismiss when clicking outside
    document.addEventListener('click', (e) => {
      if (userAccountDropdownElem && !userAccountDropdownElem.contains(e.target) && !accountBtn.contains(e.target)) {
        userAccountDropdownElem.classList.remove('active');
      }
    });

    // Dismiss on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && userAccountDropdownElem) {
        userAccountDropdownElem.classList.remove('active');
      }
    });
  }

  function updateCartBadge() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badgeElements = document.querySelectorAll('.cart-badge-count');
    badgeElements.forEach(badge => {
      badge.textContent = totalItems;
    });
  }

  window.addToCartGlobal = function(product) {
    const cart = getCart();
    const catalogItem = CFP_PRODUCTS[product.id];
    const itemPrice = catalogItem ? catalogItem.price : parseFloat(product.price);
    const itemName = catalogItem ? catalogItem.name : product.name;

    const existingIndex = cart.findIndex(item => item.id === product.id);
    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: itemName,
        price: itemPrice,
        quantity: 1
      });
    }
    saveCart(cart);
    showToast(`Added "${itemName}" to your cart!`);
  };

  // Delegated Add to Cart Click Handler
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.add-to-cart-btn');
    if (addBtn) {
      const id = addBtn.getAttribute('data-id');
      const name = addBtn.getAttribute('data-name');
      const price = addBtn.getAttribute('data-price');
      if (id && name && price) {
        window.addToCartGlobal({ id, name, price });
      }
    }
  });

  updateCartBadge();
  autofillLoggedInUser();
  initUserAccountDropdown();

  /* --------------------------------------------------------------------------
     2. NAVIGATION DRAWER CONTROLLER
     -------------------------------------------------------------------------- */
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
        if (e.target.closest('.add-to-cart-btn') || e.target.closest('.product-title-link')) {
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
     5. PRODUCT DETAILS QUANTITY PICKER
     -------------------------------------------------------------------------- */
  const qtyMinus = document.getElementById('qtyMinus');
  const qtyPlus = document.getElementById('qtyPlus');
  const qtyVal = document.getElementById('qtyVal');
  const addDetailsCartBtn = document.getElementById('addDetailsCartBtn');

  if (qtyMinus && qtyPlus && qtyVal) {
    let currentQty = 1;

    qtyMinus.addEventListener('click', () => {
      if (currentQty > 1) {
        currentQty--;
        qtyVal.textContent = currentQty;
      }
    });

    qtyPlus.addEventListener('click', () => {
      currentQty++;
      qtyVal.textContent = currentQty;
    });

    if (addDetailsCartBtn) {
      addDetailsCartBtn.addEventListener('click', () => {
        const id = addDetailsCartBtn.getAttribute('data-id') || 'p1';
        const name = addDetailsCartBtn.getAttribute('data-name') || 'Super Millet Chatpata Crunch';
        const price = parseFloat(addDetailsCartBtn.getAttribute('data-price') || '149');

        const cart = getCart();
        const existingIndex = cart.findIndex(item => item.id === id);
        if (existingIndex > -1) {
          cart[existingIndex].quantity += currentQty;
        } else {
          cart.push({ id, name, price, quantity: currentQty });
        }
        saveCart(cart);
        showToast(`Added ${currentQty} x "${name}" to cart!`);
      });
    }
  }

  /* --------------------------------------------------------------------------
     6. CART PAGE RENDERER & LOGIC
     -------------------------------------------------------------------------- */
  const cartTableBody = document.getElementById('cartTableBody');
  const cartSubtotalElem = document.getElementById('cartSubtotalElem');
  const cartShippingElem = document.getElementById('cartShippingElem');
  const cartTotalElem = document.getElementById('cartTotalElem');

  function renderCartPage() {
    updateUserGreeting();
    if (!cartTableBody) return;

    const cart = getCart();
    const summary = calculateOrderSummary(cart);

    if (summary.items.length === 0) {
      cartTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 40px 0;">
            <h3>Your cart is empty</h3>
            <p style="color: var(--color-text-muted); margin: 8px 0 16px 0;">Explore our wholesome millet snacks and add items to your basket!</p>
            <a href="shop.html" class="btn btn-primary btn-sm">SHOP NOW →</a>
          </td>
        </tr>
      `;
      if (cartSubtotalElem) cartSubtotalElem.textContent = '₹0';
      if (cartShippingElem) cartShippingElem.textContent = '₹0';
      if (cartTotalElem) cartTotalElem.textContent = '₹0';
      return;
    }

    cartTableBody.innerHTML = summary.items.map(item => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 42px; height: 42px; background: var(--bg-subtle); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">🌾</div>
            <div>
              <strong>${item.name}</strong>
              <small style="display: block; color: var(--color-text-muted);">₹${item.price} each</small>
            </div>
          </div>
        </td>
        <td>₹${item.price}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="qty-control-btn cart-minus" data-id="${item.id}" aria-label="Decrease quantity">-</button>
            <span style="min-width: 24px; text-align: center; font-weight: 700;">${item.quantity}</span>
            <button class="qty-control-btn cart-plus" data-id="${item.id}" aria-label="Increase quantity">+</button>
          </div>
        </td>
        <td><strong>₹${item.itemTotal}</strong></td>
        <td>
          <button class="cart-remove-btn" data-id="${item.id}" aria-label="Remove item" style="color: var(--color-green); font-weight: 800; font-size: 1.25rem; cursor: pointer; border: none; background: transparent; padding: 4px 8px;">&times;</button>
        </td>
      </tr>
    `).join('');

    if (cartSubtotalElem) cartSubtotalElem.textContent = `₹${summary.subtotal}`;
    if (cartShippingElem) cartShippingElem.textContent = summary.shippingText;
    if (cartTotalElem) cartTotalElem.textContent = `₹${summary.total}`;
  }

  if (cartTableBody) {
    document.addEventListener('click', (e) => {
      const cart = getCart();

      const minusBtn = e.target.closest('.cart-minus');
      if (minusBtn) {
        const id = minusBtn.getAttribute('data-id');
        const item = cart.find(i => i.id === id);
        if (item) {
          item.quantity--;
          if (item.quantity <= 0) {
            const updated = cart.filter(i => i.id !== id);
            saveCart(updated);
          } else {
            saveCart(cart);
          }
          renderCartPage();
        }
      }

      const plusBtn = e.target.closest('.cart-plus');
      if (plusBtn) {
        const id = plusBtn.getAttribute('data-id');
        const item = cart.find(i => i.id === id);
        if (item) {
          item.quantity++;
          saveCart(cart);
          renderCartPage();
        }
      }

      const removeBtn = e.target.closest('.cart-remove-btn');
      if (removeBtn) {
        const id = removeBtn.getAttribute('data-id');
        const updated = cart.filter(i => i.id !== id);
        saveCart(updated);
        renderCartPage();
      }
    });

    renderCartPage();
  }

  /* --------------------------------------------------------------------------
     7. CHECKOUT ORDER FLOW & AUTHORITATIVE TOTALS
     -------------------------------------------------------------------------- */
  const checkoutOrderForm = document.getElementById('checkoutOrderForm');
  const checkoutItemsList = document.getElementById('checkoutItemsList');
  const checkoutSubtotalElem = document.getElementById('checkoutSubtotalElem');
  const checkoutShippingElem = document.getElementById('checkoutShippingElem');
  const checkoutTotalElem = document.getElementById('checkoutTotalElem');
  const placeOrderBtn = document.getElementById('placeOrderBtn');
  const custPincodeInput = document.getElementById('custPincode');

  function renderCheckoutPage() {
    if (!checkoutOrderForm) return;

    autofillLoggedInUser();

    const cart = getCart();
    const summary = calculateOrderSummary(cart);

    if (summary.items.length === 0) {
      if (checkoutItemsList) {
        checkoutItemsList.innerHTML = `
          <div style="text-align: center; padding: 24px 0; color: var(--color-text-muted);">
            <p style="margin-bottom: 12px; font-weight: 600;">Your cart is currently empty.</p>
            <a href="shop.html" class="btn btn-secondary btn-sm">Explore Millet Snacks →</a>
          </div>
        `;
      }
      if (checkoutSubtotalElem) checkoutSubtotalElem.textContent = '₹0';
      if (checkoutShippingElem) checkoutShippingElem.textContent = '₹0';
      if (checkoutTotalElem) checkoutTotalElem.textContent = '₹0';
      if (placeOrderBtn) {
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = 'Cart is Empty';
        placeOrderBtn.style.opacity = '0.6';
        placeOrderBtn.style.cursor = 'not-allowed';
      }
      return;
    }

    if (checkoutItemsList) {
      checkoutItemsList.innerHTML = summary.items.map(item => `
        <div class="checkout-item-row">
          <div>
            <strong>${item.name}</strong>
            <small style="display: block; color: var(--color-text-muted);">₹${item.price} &times; ${item.quantity}</small>
          </div>
          <strong>₹${item.itemTotal}</strong>
        </div>
      `).join('');
    }

    if (checkoutSubtotalElem) checkoutSubtotalElem.textContent = `₹${summary.subtotal}`;
    if (checkoutShippingElem) checkoutShippingElem.textContent = summary.shipping === 0 ? 'FREE' : `₹${summary.shipping}`;
    if (checkoutTotalElem) checkoutTotalElem.textContent = `₹${summary.total}`;

    if (placeOrderBtn) {
      placeOrderBtn.disabled = false;
      placeOrderBtn.textContent = `Pay ₹${summary.total} • Place Order →`;
      placeOrderBtn.style.opacity = '1';
      placeOrderBtn.style.cursor = 'pointer';
    }
  }

  if (checkoutOrderForm) {
    let isSubmittingOrder = false;

    renderCheckoutPage();

    // Recalculate transparently on pincode change
    if (custPincodeInput) {
      custPincodeInput.addEventListener('input', () => {
        renderCheckoutPage();
      });
    }

    checkoutOrderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (isSubmittingOrder) return; // Prevent duplicate charges / orders

      const cart = getCart();
      const summary = calculateOrderSummary(cart);

      if (summary.items.length === 0) {
        alert('Your cart is empty. Please add items before placing an order.');
        window.location.href = 'shop.html';
        return;
      }

      const fullName = (document.getElementById('custFullName')?.value || '').trim();
      const email = (document.getElementById('custEmail')?.value || '').trim();
      const pincode = (document.getElementById('custPincode')?.value || '').trim();

      if (!fullName || !email) {
        alert('Please provide your name and email address to proceed.');
        return;
      }

      // Lock form submission
      isSubmittingOrder = true;
      if (placeOrderBtn) {
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = 'Processing Order...';
      }

      const phone = (document.getElementById('custPhone')?.value || '').trim();
      const address = (document.getElementById('custAddress')?.value || '').trim();
      const city = (document.getElementById('custCity')?.value || '').trim();
      const state = (document.getElementById('custState')?.value || '').trim();
      const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'cod';

      const orderPayload = {
        guestEmail: email,
        guestPhone: phone,
        paymentMethod,
        items: summary.items.map(i => ({ id: i.id, quantity: i.quantity })),
        shippingAddress: {
          recipient_name: fullName,
          email,
          phone,
          address_line1: address,
          city,
          state,
          postal_code: pincode
        }
      };

      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      })
      .then(res => res.json().then(data => ({ status: res.status, ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data.success) {
          throw new Error(data.error || (data.errors ? data.errors[0] : 'Failed to place order.'));
        }

        const createdOrder = data.order;

        // Save order into customer's local history for convenient dashboard view
        const newOrderRecord = {
          orderId: createdOrder.orderNumber,
          date: new Date(createdOrder.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          status: 'Placed',
          items: summary.items,
          subtotal: createdOrder.subtotal,
          shipping: createdOrder.shippingFee,
          total: createdOrder.totalAmount
        };
        saveUserOrder(newOrderRecord);

        // Clear cart
        localStorage.removeItem('cfp_cart');
        updateCartBadge();

        // Redirect to live order tracking page
        window.location.href = `track-order.html?token=${encodeURIComponent(createdOrder.guestTrackingToken)}&orderNumber=${encodeURIComponent(createdOrder.orderNumber)}`;
      })
      .catch(err => {
        alert(err.message || 'An error occurred while creating your order. Please try again.');
        isSubmittingOrder = false;
        if (placeOrderBtn) {
          placeOrderBtn.disabled = false;
          placeOrderBtn.textContent = `Pay ₹${summary.total} • Place Order →`;
        }
      });
    });
  }

  /* --------------------------------------------------------------------------
     8. LOGIN & REGISTER TAB SWITCHER & ACCOUNT DASHBOARD
     -------------------------------------------------------------------------- */
  function getUserOrders() {
    const user = getAuthUser();
    if (!user) return [];
    try {
      const key = `cfp_orders_${user.email || 'guest'}`;
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
      // Sample realistic initial orders for member history
      return [
        {
          orderId: 'CFP-982143',
          date: '08 Oct 2026, 11:30 AM',
          status: 'Delivered',
          items: [
            { name: 'Ragi Sticks', quantity: 2, price: 99, itemTotal: 198 },
            { name: 'Millet Nutri Bar', quantity: 1, price: 49, itemTotal: 49 }
          ],
          subtotal: 247,
          shipping: 50,
          total: 297
        }
      ];
    } catch (e) {
      return [];
    }
  }

  function saveUserOrder(order) {
    const user = getAuthUser();
    if (!user) return;
    try {
      const key = `cfp_orders_${user.email || 'guest'}`;
      const orders = getUserOrders();
      orders.unshift(order);
      localStorage.setItem(key, JSON.stringify(orders));
    } catch (e) {}
  }

  function getSavedAddresses() {
    const user = getAuthUser();
    if (!user) return [];
    try {
      const key = `cfp_addresses_${user.email || 'guest'}`;
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
      return [
        {
          id: 'addr_1',
          fullName: user.name || 'John Doe',
          phone: user.phone || '+91 98765 43210',
          address: 'Flat 402, Green Meadows, MG Road',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411001',
          isDefault: true
        }
      ];
    } catch (e) {
      return [];
    }
  }

  function saveSavedAddresses(addresses) {
    const user = getAuthUser();
    if (!user) return;
    try {
      const key = `cfp_addresses_${user.email || 'guest'}`;
      const capped = addresses.slice(0, 5); // Maximum 5 addresses
      localStorage.setItem(key, JSON.stringify(capped));
    } catch (e) {}
  }

  function renderAccountPage() {
    const authForms = document.getElementById('authFormsContainer');
    const dashboard = document.getElementById('accountDashboardContainer');
    const pageTitle = document.getElementById('authPageTitle');
    const pageSubtitle = document.getElementById('authPageSubtitle');
    if (!authForms && !dashboard) return;

    const user = getAuthUser();

    if (!user) {
      // Show login/registration view
      if (authForms) authForms.style.display = 'block';
      if (dashboard) dashboard.style.display = 'none';
      if (pageTitle) pageTitle.textContent = 'Login / Register';
      if (pageSubtitle) pageSubtitle.textContent = 'Sign in or create an account for express checkout and order tracking';
      return;
    }

    // Show Account Dashboard view
    if (authForms) authForms.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';
    if (pageTitle) pageTitle.textContent = 'My Account Dashboard';
    if (pageSubtitle) pageSubtitle.textContent = `Welcome back, ${user.name}`;

    const firstName = user.name ? user.name.trim().split(/\s+/)[0] : 'Customer';
    const initial = firstName.charAt(0).toUpperCase();
    const memberSince = user.memberSince || 'October 2026';
    const userPhone = user.phone || '+91 98765 43210';

    const orders = getUserOrders();
    const addresses = getSavedAddresses();
    const cart = getCart();
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    dashboard.innerHTML = `
      <!-- TOP STRIP: GREETING & QUICK SHORTCUTS -->
      <div class="account-top-strip">
        <div class="account-welcome-box">
          <div class="account-large-avatar">${initial}</div>
          <div class="account-welcome-text">
            <h2>Welcome back, ${firstName}!</h2>
            <p>Member since ${memberSince} • ${user.email}</p>
          </div>
        </div>
        <div class="account-shortcuts-bar">
          <a href="cart.html" class="account-shortcut-btn btn-cart">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            View Cart (${cartCount})
          </a>
          <a href="shop.html" class="account-shortcut-btn btn-shop">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Continue Shopping
          </a>
          <button type="button" class="account-shortcut-btn btn-logout" id="dashLogoutBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </button>
        </div>
      </div>

      <!-- 2-COLUMN DASHBOARD GRID -->
      <div class="account-grid">
        
        <!-- COLUMN 1: PROFILE DETAILS & SAVED ADDRESSES -->
        <div>
          
          <!-- PROFILE DETAILS CARD -->
          <div class="account-card">
            <div class="account-card-header">
              <h3 class="account-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Profile Details
              </h3>
              <button type="button" class="btn btn-outline btn-sm" id="toggleEditProfileBtn" style="padding: 4px 10px; font-size: 0.8rem;">Edit Profile</button>
            </div>

            <!-- Profile Display Mode -->
            <div id="profileDisplayMode" class="profile-info-list">
              <div class="profile-info-item">
                <span class="profile-info-label">Full Name</span>
                <span class="profile-info-value" id="dispProfileName">${user.name}</span>
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">Email Address</span>
                <span class="profile-info-value">${user.email}</span>
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">Phone Number</span>
                <span class="profile-info-value" id="dispProfilePhone">${userPhone}</span>
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">Account Created</span>
                <span class="profile-info-value">${memberSince}</span>
              </div>
            </div>

            <!-- Profile Edit Form Mode -->
            <form id="profileEditForm" style="display: none; margin-top: 10px;">
              <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" style="font-size: 0.8rem;">Full Name</label>
                <input type="text" id="editProfileName" class="form-input" value="${user.name}" required>
              </div>
              <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" style="font-size: 0.8rem;">Phone Number</label>
                <input type="tel" id="editProfilePhone" class="form-input" value="${userPhone}" placeholder="+91 98765 43210">
              </div>
              <div style="display: flex; gap: 8px; margin-top: 14px;">
                <button type="submit" class="btn btn-primary btn-sm">Save Changes</button>
                <button type="button" class="btn btn-outline btn-sm" id="cancelEditProfileBtn">Cancel</button>
              </div>
            </form>
          </div>

          <!-- SAVED SHIPPING ADDRESSES CARD (MAX 5) -->
          <div class="account-card">
            <div class="account-card-header">
              <h3 class="account-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                Saved Addresses (${addresses.length}/5)
              </h3>
              ${addresses.length < 5 ? `<button type="button" class="btn btn-outline btn-sm" id="toggleAddAddressBtn" style="padding: 4px 10px; font-size: 0.8rem;">+ Add New</button>` : `<span style="font-size: 0.75rem; color: var(--color-text-muted); font-weight: 700;">Max limit (5) reached</span>`}
            </div>

            <!-- Add Address Form (Toggled) -->
            <form id="newAddressForm" style="display: none; background: var(--color-yellow-light); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px; margin-bottom: 16px;">
              <h4 style="font-size: 0.92rem; margin-bottom: 12px; color: var(--color-green);">Add New Delivery Address</h4>
              <div class="form-group" style="margin-bottom: 8px;">
                <input type="text" id="addrFullName" class="form-input" placeholder="Full Name" value="${user.name}" required style="padding: 8px 10px; font-size: 0.85rem;">
              </div>
              <div class="form-group" style="margin-bottom: 8px;">
                <input type="tel" id="addrPhone" class="form-input" placeholder="Phone Number (+91...)" value="${userPhone}" required style="padding: 8px 10px; font-size: 0.85rem;">
              </div>
              <div class="form-group" style="margin-bottom: 8px;">
                <input type="text" id="addrLine" class="form-input" placeholder="Flat, Street, Landmark" required style="padding: 8px 10px; font-size: 0.85rem;">
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                <input type="text" id="addrCity" class="form-input" placeholder="City" required style="padding: 8px 10px; font-size: 0.85rem;">
                <input type="text" id="addrPincode" class="form-input" placeholder="Pincode (6 digits)" maxlength="6" pattern="[1-9][0-9]{5}" required style="padding: 8px 10px; font-size: 0.85rem;">
              </div>
              <div class="form-group" style="margin-bottom: 10px;">
                <label style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 600;">
                  <input type="checkbox" id="addrSetDefault"> Set as default delivery address
                </label>
              </div>
              <div style="display: flex; gap: 8px;">
                <button type="submit" class="btn btn-primary btn-sm">Save Address</button>
                <button type="button" class="btn btn-outline btn-sm" id="cancelAddAddressBtn">Cancel</button>
              </div>
            </form>

            <!-- List of Saved Addresses -->
            <div id="savedAddressesList">
              ${addresses.map((addr, idx) => `
                <div class="address-card-item ${addr.isDefault ? 'is-default' : ''}">
                  ${addr.isDefault ? `<span class="address-tag-badge">DEFAULT ADDRESS</span>` : ''}
                  <strong style="display: block; font-size: 0.95rem; margin-bottom: 2px;">${addr.fullName}</strong>
                  <p style="margin: 0 0 2px 0; font-size: 0.86rem; color: var(--color-text-dark);">${addr.address}, ${addr.city}, ${addr.state || 'Maharashtra'} - ${addr.pincode}</p>
                  <small style="color: var(--color-text-muted); font-weight: 600;">Phone: ${addr.phone}</small>
                  <div class="address-card-actions">
                    ${!addr.isDefault ? `<button type="button" class="btn-address-action btn-set-default" data-index="${idx}">★ Set as Default</button>` : ''}
                    <button type="button" class="btn-address-action btn-delete-addr" data-index="${idx}">🗑 Remove</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

        <!-- COLUMN 2: ALL PREVIOUS ORDERS HISTORY -->
        <div>
          <div class="account-card">
            <div class="account-card-header">
              <h3 class="account-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                Previous Orders (${orders.length})
              </h3>
              <span style="font-size: 0.82rem; color: var(--color-text-muted); font-weight: 700;">All Order Records</span>
            </div>

            ${orders.length === 0 ? `
              <div style="text-align: center; padding: 40px 20px; color: var(--color-text-muted);">
                <p style="font-size: 1.05rem; font-weight: 700; margin-bottom: 8px;">No orders found yet</p>
                <p style="margin-bottom: 18px; font-size: 0.9rem;">Your past purchases will appear here automatically.</p>
                <a href="shop.html" class="btn btn-primary btn-sm">Start Shopping →</a>
              </div>
            ` : `
              <div class="orders-history-list">
                ${orders.map(order => `
                  <div class="order-card-item">
                    <div class="order-card-top">
                      <div>
                        <span class="order-number-tag">Order #${order.orderId}</span>
                        <div class="order-date-text">Placed on ${order.date}</div>
                      </div>
                      <span class="order-status-badge ${order.status.toLowerCase() === 'delivered' ? 'status-delivered' : 'status-processing'}">${order.status}</span>
                    </div>

                    <table class="order-items-table">
                      <tbody>
                        ${order.items.map(item => `
                          <tr>
                            <td><strong>${item.name}</strong> <span style="color: var(--color-text-muted); font-size: 0.82rem;">(x${item.quantity})</span></td>
                            <td style="text-align: right; font-weight: 700;">₹${item.itemTotal || (item.price * item.quantity)}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>

                    <div class="order-total-row">
                      <span style="color: var(--color-text-muted); font-size: 0.88rem;">Shipping: ${order.shipping === 0 ? 'FREE' : '₹' + order.shipping}</span>
                      <strong>Total Paid: ₹${order.total}</strong>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>

      </div>
    `;

    // 1. Dashboard Logout Button
    const dashLogoutBtn = document.getElementById('dashLogoutBtn');
    if (dashLogoutBtn) {
      dashLogoutBtn.addEventListener('click', () => {
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
        setAuthUser(null);
        renderAccountPage();
        showToast('You have been logged out.');
      });
    }

    // 2. Profile Edit Toggle & Save
    const toggleEditProfileBtn = document.getElementById('toggleEditProfileBtn');
    const profileDisplayMode = document.getElementById('profileDisplayMode');
    const profileEditForm = document.getElementById('profileEditForm');
    const cancelEditProfileBtn = document.getElementById('cancelEditProfileBtn');

    if (toggleEditProfileBtn && profileEditForm && profileDisplayMode) {
      toggleEditProfileBtn.addEventListener('click', () => {
        profileDisplayMode.style.display = 'none';
        profileEditForm.style.display = 'block';
        toggleEditProfileBtn.style.display = 'none';
      });

      if (cancelEditProfileBtn) {
        cancelEditProfileBtn.addEventListener('click', () => {
          profileDisplayMode.style.display = 'flex';
          profileEditForm.style.display = 'none';
          toggleEditProfileBtn.style.display = 'block';
        });
      }

      profileEditForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newName = (document.getElementById('editProfileName')?.value || '').trim();
        const newPhone = (document.getElementById('editProfilePhone')?.value || '').trim();
        if (newName) {
          user.name = newName;
          user.phone = newPhone;
          setAuthUser(user);
          renderAccountPage();
          showToast('Profile updated successfully.');
        }
      });
    }

    // 3. Saved Addresses: Toggle Add Form
    const toggleAddAddressBtn = document.getElementById('toggleAddAddressBtn');
    const newAddressForm = document.getElementById('newAddressForm');
    const cancelAddAddressBtn = document.getElementById('cancelAddAddressBtn');

    if (toggleAddAddressBtn && newAddressForm) {
      toggleAddAddressBtn.addEventListener('click', () => {
        newAddressForm.style.display = 'block';
        toggleAddAddressBtn.style.display = 'none';
      });

      if (cancelAddAddressBtn) {
        cancelAddAddressBtn.addEventListener('click', () => {
          newAddressForm.style.display = 'none';
          toggleAddAddressBtn.style.display = 'block';
        });
      }

      newAddressForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const currentAddrs = getSavedAddresses();
        if (currentAddrs.length >= 5) {
          alert('You have reached the maximum limit of 5 saved addresses.');
          return;
        }

        const fullName = (document.getElementById('addrFullName')?.value || '').trim();
        const phone = (document.getElementById('addrPhone')?.value || '').trim();
        const address = (document.getElementById('addrLine')?.value || '').trim();
        const city = (document.getElementById('addrCity')?.value || '').trim();
        const pincode = (document.getElementById('addrPincode')?.value || '').trim();
        const isDefault = document.getElementById('addrSetDefault')?.checked;

        if (isDefault) {
          currentAddrs.forEach(a => a.isDefault = false);
        }

        currentAddrs.push({
          id: 'addr_' + Date.now(),
          fullName,
          phone,
          address,
          city,
          state: 'Maharashtra',
          pincode,
          isDefault: currentAddrs.length === 0 ? true : isDefault
        });

        saveSavedAddresses(currentAddrs);
        renderAccountPage();
        showToast('New address saved successfully.');
      });
    }

    // 4. Saved Addresses Actions (Set Default, Delete)
    const savedAddressesList = document.getElementById('savedAddressesList');
    if (savedAddressesList) {
      savedAddressesList.addEventListener('click', (e) => {
        const setDefaultBtn = e.target.closest('.btn-set-default');
        if (setDefaultBtn) {
          const index = parseInt(setDefaultBtn.getAttribute('data-index'), 10);
          const currentAddrs = getSavedAddresses();
          currentAddrs.forEach((a, i) => {
            a.isDefault = (i === index);
          });
          saveSavedAddresses(currentAddrs);
          renderAccountPage();
          showToast('Default delivery address updated.');
        }

        const deleteBtn = e.target.closest('.btn-delete-addr');
        if (deleteBtn) {
          const index = parseInt(deleteBtn.getAttribute('data-index'), 10);
          const currentAddrs = getSavedAddresses();
          currentAddrs.splice(index, 1);
          if (currentAddrs.length > 0 && !currentAddrs.some(a => a.isDefault)) {
            currentAddrs[0].isDefault = true;
          }
          saveSavedAddresses(currentAddrs);
          renderAccountPage();
          showToast('Address removed.');
        }
      });
    }
  }

  const authTabs = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (authTabs.length > 0 && loginForm && registerForm) {
    authTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const target = tab.getAttribute('data-tab');
        if (target === 'login') {
          loginForm.style.display = 'block';
          registerForm.style.display = 'none';
        } else {
          loginForm.style.display = 'none';
          registerForm.style.display = 'block';
        }
      });
    });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (document.getElementById('loginEmail')?.value || '').trim();
      const password = (document.getElementById('loginPassword')?.value || '').trim();

      if (!email || !password) {
        alert('Please enter your email and password.');
        return;
      }

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          const user = data.user;
          const memberDate = new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
          setAuthUser({
            name: user.full_name,
            email: user.email,
            phone: user.phone,
            id: user.id,
            memberSince: memberDate
          });
          alert(`Welcome back, ${user.full_name}!`);
          renderAccountPage();
        } else {
          alert(data.error || 'Login failed. Please check your credentials.');
        }
      } catch (err) {
        alert('Unable to reach server. Please try again.');
      }
    });

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = (document.getElementById('regName')?.value || '').trim();
      const email = (document.getElementById('regEmail')?.value || '').trim();
      const password = (document.getElementById('regPassword')?.value || '').trim();

      if (!name || !email || !password) {
        alert('Please fill out all required fields.');
        return;
      }

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName: name, email, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          const user = data.user;
          setAuthUser({
            name: user.full_name,
            email: user.email,
            phone: user.phone,
            id: user.id,
            memberSince: 'Today'
          });
          alert(`Account created successfully! Welcome, ${user.full_name}.`);
          renderAccountPage();
        } else {
          alert(data.error || (data.errors ? data.errors[0] : 'Registration failed.'));
        }
      } catch (err) {
        alert('Unable to reach server. Please try again.');
      }
    });

    renderAccountPage();
  }

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

