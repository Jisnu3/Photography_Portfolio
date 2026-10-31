/* ===================================================================
   JISNU HAZRA PHOTOGRAPHY PORTFOLIO - MAIN CLIENT SCRIPT
   Firebase Cloud Firestore Integration (Live Gallery + Realtime Bookings)
   =================================================================== */

import { db } from './firebase.js';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

function initMain() {
  // 1. STICKY NAVBAR & ACTIVE LINK TRACKING
  const navbar = document.querySelector('.navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Scroll spy
    let current = '';
    const scrollPos = window.scrollY + 120;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });

  // 2. HERO SLIDER CAROUSEL (AUTOMATIC ROTATION)
  const slides = document.querySelectorAll('.hero-slide');
  const heroTitle = document.getElementById('heroTitle');
  const heroSubtitle = document.getElementById('heroSubtitle');

  const heroData = [
    {
      title: 'Through<br>My Lens',
      sub: 'People · Places · Emotions · Stories',
      subDesc: 'Captured in a different perspective.'
    },
    {
      title: 'Ethereal<br>Wilderness',
      sub: 'Peaks · Forests · Solitude · Nature',
      subDesc: 'Preserving the untouched grandeur of earth.'
    },
    {
      title: 'Moments<br>& Timeless',
      sub: 'Streets · Heritage · Light · Raw Life',
      subDesc: 'Finding authentic human stories in every corner.'
    }
  ];

  let currentSlideIndex = 0;

  function showSlide(index) {
    slides.forEach((s, i) => {
      s.classList.toggle('active', i === index);
    });

    if (heroTitle && heroSubtitle && heroData[index]) {
      heroTitle.style.opacity = '0';
      heroSubtitle.style.opacity = '0';
      setTimeout(() => {
        heroTitle.innerHTML = heroData[index].title;
        heroSubtitle.innerHTML = `${heroData[index].sub} <span>${heroData[index].subDesc}</span>`;
        heroTitle.style.opacity = '1';
        heroSubtitle.style.opacity = '1';
      }, 350);
    }
    currentSlideIndex = index;
  }

  function nextSlide() {
    if (slides.length <= 1) return;
    let nextIdx = (currentSlideIndex + 1) % slides.length;
    showSlide(nextIdx);
  }

  // Autoplay hero slideshow smoothly every 5.5 seconds
  if (slides.length > 1) {
    setInterval(nextSlide, 5500);
  }

  // 3. LIGHTBOX MODAL FOR GALLERY
  const lightbox = document.getElementById('galleryLightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');

  let activeGalleryItems = [];
  let currentLightboxIdx = 0;

  function getVisibleGalleryItems() {
    return Array.from(document.querySelectorAll('.gallery-item')).filter(item => item.style.display !== 'none');
  }

  function openLightbox(item) {
    if (!lightbox || !lightboxImg) return;
    const img = item.querySelector('img');
    const title = item.querySelector('.gallery-item-title')?.textContent || 'Photograph';

    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt || title;
    if (lightboxTitle) lightboxTitle.textContent = title;

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  function stepLightbox(direction) {
    if (activeGalleryItems.length === 0) activeGalleryItems = getVisibleGalleryItems();
    if (activeGalleryItems.length === 0) return;
    currentLightboxIdx = (currentLightboxIdx + direction + activeGalleryItems.length) % activeGalleryItems.length;
    openLightbox(activeGalleryItems[currentLightboxIdx]);
  }

  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      stepLightbox(-1);
    });
  }

  if (lightboxNext) {
    lightboxNext.addEventListener('click', (e) => {
      e.stopPropagation();
      stepLightbox(1);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') stepLightbox(-1);
    if (e.key === 'ArrowRight') stepLightbox(1);
  });

  // Attach click listeners to gallery items
  function attachGalleryListeners() {
    const items = document.querySelectorAll('.gallery-item');
    items.forEach(item => {
      // Remove any previously bound listeners
      item.onclick = () => {
        activeGalleryItems = getVisibleGalleryItems();
        currentLightboxIdx = activeGalleryItems.indexOf(item);
        openLightbox(item);
      };
    });
  }

  // 4. PORTFOLIO FILTERING
  const filterPills = document.querySelectorAll('.filter-pill');

  function setupFilters() {
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const filterVal = pill.getAttribute('data-filter').toLowerCase();
        const galleryItems = document.querySelectorAll('.gallery-item');

        galleryItems.forEach(item => {
          const itemCategory = (item.getAttribute('data-category') || '').toLowerCase();
          if (filterVal === 'all' || itemCategory.includes(filterVal)) {
            item.style.display = 'block';
            setTimeout(() => {
              item.style.opacity = '1';
              item.style.transform = 'scale(1)';
            }, 50);
          } else {
            item.style.opacity = '0';
            item.style.transform = 'scale(0.95)';
            setTimeout(() => {
              item.style.display = 'none';
            }, 250);
          }
        });
      });
    });
  }

  attachGalleryListeners();
  setupFilters();

  // 5. DYNAMIC FIREBASE CLOUD GALLERY SYNC
  async function loadDynamicGallery() {
    const galleryGrid = document.getElementById('galleryGrid') || document.querySelector('.gallery-grid');
    if (!galleryGrid) {
      console.warn("Gallery grid element not found in DOM");
      return;
    }

    let dynamicPhotos = [];

    // 1. Fetch live from Firestore collection "photos"
    try {
      const snapshot = await getDocs(collection(db, "photos"));
      if (!snapshot.empty) {
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          dynamicPhotos.push({
            id: docSnap.id,
            docId: docSnap.id,
            title: data.title || 'Untitled',
            category: data.category || 'Travel',
            img: data.img,
            date: data.date || 'Recent Capture'
          });
        });
        console.log(`[Public Gallery] Fetched ${dynamicPhotos.length} photos from Cloud Firestore`);
      }
    } catch (err) {
      console.warn("[Public Gallery] Firestore fetch notice:", err.message);
    }

    // 2. Also merge with any newly uploaded photos from localStorage
    const stored = localStorage.getItem('jisnu_admin_photos');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach(localP => {
            const isUserPhoto = localP && localP.img && (
              localP.docId ||
              localP.storagePath ||
              localP.img.includes('uploads') ||
              localP.img.startsWith('data:') ||
              localP.img.startsWith('http') ||
              (typeof localP.id === 'string') ||
              (typeof localP.id === 'number' && localP.id > 24) ||
              !localP.img.includes('portfolio_')
            );
            if (isUserPhoto) {
              const alreadyExists = dynamicPhotos.some(dp => 
                (dp.docId && localP.docId && dp.docId === localP.docId) ||
                (dp.id && localP.id && dp.id === localP.id) || 
                (dp.title === localP.title && dp.img === localP.img)
              );
              if (!alreadyExists) {
                dynamicPhotos.unshift(localP);
              }
            }
          });
        }
      } catch (e) {
        console.warn("[Public Gallery] LocalStorage notice:", e);
      }
    }

    // 3. Prepend uploaded photos to the top of the gallery grid
    if (dynamicPhotos.length > 0) {
      // Remove any previously injected dynamic items to prevent duplicates
      document.querySelectorAll('.dynamic-cloud-item').forEach(el => el.remove());

      const colTypes = ['col-tall', 'col-wide', 'col-mid', 'col-card', 'col-square'];

      dynamicPhotos.forEach((photo, idx) => {
        const catClass = (photo.category || 'Travel').toLowerCase();
        const colClass = colTypes[idx % colTypes.length];

        const itemEl = document.createElement('div');
        itemEl.className = `gallery-item dynamic-cloud-item ${colClass}`;
        itemEl.setAttribute('data-category', catClass);
        itemEl.innerHTML = `
          <img src="${photo.img}" alt="${photo.title || 'Photograph'}" loading="lazy" onerror="this.src='assets/images/hero_sunset.jpg'">
          <div class="gallery-overlay">
            <span class="gallery-badge">${photo.category || 'Featured'}</span>
            <h3 class="gallery-item-title">${photo.title || 'Masterpiece'}</h3>
            <div class="gallery-meta">
              <span>${photo.date || 'Recent Capture'}</span>
              <span>Click to view</span>
            </div>
          </div>
        `;
        galleryGrid.prepend(itemEl);
      });

      // Re-attach lightbox click handlers and filter handlers
      attachGalleryListeners();
      setupFilters();
    }
  }

  loadDynamicGallery();

  // Auto-refresh dynamic gallery when user returns to tab
  window.addEventListener('focus', () => {
    loadDynamicGallery();
  });
  window.addEventListener('storage', (e) => {
    if (e.key === 'jisnu_admin_photos') {
      loadDynamicGallery();
    }
  });

  // 6. SERVICES "BOOK SESSION" CLICK -> AUTO-SELECT & FOCUS BOOKING FORM
  const serviceBookBtns = document.querySelectorAll('.service-book-btn');
  const bookingServiceSelect = document.getElementById('bookingService');

  serviceBookBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedService = btn.getAttribute('data-service');
      if (bookingServiceSelect && selectedService) {
        bookingServiceSelect.value = selectedService;
      }
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          document.getElementById('clientName')?.focus();
        }, 600);
      }
    });
  });

  // 7. BOOKING & CONTACT FORM SUBMISSION WITH FIRESTORE
  const bookingForm = document.getElementById('bookingForm');
  const toastNotice = document.getElementById('toastNotice');
  const toastMsg = document.getElementById('toastMsg');

  function showToast(message) {
    if (!toastNotice) return;
    toastMsg.textContent = message;
    toastNotice.classList.add('show');
    setTimeout(() => {
      toastNotice.classList.remove('show');
    }, 4500);
  }

  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = bookingForm.querySelector('.btn-submit-message');
      const originalText = submitBtn.innerHTML;

      submitBtn.innerHTML = `<span>Sending to Jisnu Hazra...</span>`;
      submitBtn.style.opacity = '0.75';
      submitBtn.disabled = true;

      const name = document.getElementById('clientName')?.value.trim() || '';
      const email = document.getElementById('clientEmail')?.value.trim() || '';
      const phone = document.getElementById('clientPhone')?.value.trim() || '';
      const service = document.getElementById('bookingService')?.value || 'General Inquiry';
      const date = document.getElementById('bookingDate')?.value || '';
      const message = document.getElementById('clientMessage')?.value.trim() || '';

      // Save enquiry to Firebase Firestore collection "bookings"
      try {
        await addDoc(collection(db, "bookings"), {
          name,
          email,
          phone,
          service,
          date,
          message,
          createdAt: serverTimestamp()
        });
        console.log("Client enquiry saved to Firestore bookings collection");
      } catch (err) {
        console.warn("Firestore enquiry save notice:", err.message);
      }

      submitBtn.innerHTML = originalText;
      submitBtn.style.opacity = '1';
      submitBtn.disabled = false;
      bookingForm.reset();
      showToast('Enquiry received! Jisnu Hazra will get back to you within 24 hours.');
    });
  }

  // 8. MORE ABOUT ME MODAL
  const moreAboutBtn = document.getElementById('moreAboutBtn');
  const aboutModal = document.getElementById('aboutModal');
  const aboutModalClose = document.getElementById('aboutModalClose');

  if (moreAboutBtn && aboutModal) {
    moreAboutBtn.addEventListener('click', () => {
      aboutModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }

  if (aboutModalClose && aboutModal) {
    aboutModalClose.addEventListener('click', () => {
      aboutModal.classList.remove('active');
      document.body.style.overflow = '';
    });
    aboutModal.addEventListener('click', (e) => {
      if (e.target === aboutModal) {
        aboutModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  // 9. BACK TO TOP BUTTON
  const backToTopBtn = document.getElementById('backToTopBtn');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // 10. MOBILE MENU TOGGLE
  const mobileToggle = document.getElementById('mobileNavToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const mobileDrawerBackdrop = document.getElementById('mobileDrawerBackdrop');
  const mobileClose = document.getElementById('mobileClose');
  const mobileLinks = document.querySelectorAll('.mobile-drawer-link, .mobile-drawer-cta');

  function openDrawer() {
    if (mobileDrawer) mobileDrawer.classList.add('active');
    if (mobileDrawerBackdrop) mobileDrawerBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (mobileDrawer) mobileDrawer.classList.remove('active');
    if (mobileDrawerBackdrop) mobileDrawerBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (mobileToggle) {
    mobileToggle.addEventListener('click', openDrawer);
  }
  if (mobileClose) {
    mobileClose.addEventListener('click', closeDrawer);
  }
  if (mobileDrawerBackdrop) {
    mobileDrawerBackdrop.addEventListener('click', closeDrawer);
  }
  mobileLinks.forEach(link => {
    link.addEventListener('click', closeDrawer);
  });
}

// Trigger initMain reliably on all document ready states
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMain);
} else {
  initMain();
}
