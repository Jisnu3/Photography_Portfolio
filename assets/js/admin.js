/* ===================================================================
   JISNU HAZRA PHOTOGRAPHY - FIREBASE ADMIN PANEL JAVASCRIPT
   Cloud Firestore + Firebase Cloud Storage + Firebase Auth
   =================================================================== */

import { auth, db, storage } from './firebase.js';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import {
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Initial fallback photos (used before cloud sync or when offline)
const INITIAL_PHOTOS = [
  { id: 1, title: 'Kolkata Sunrise', category: 'Travel', date: '30 Oct 2026', img: 'assets/images/kolkata_bridge_sunset.jpg' },
  { id: 2, title: 'Mountain View', category: 'Nature', date: '28 Oct 2026', img: 'assets/images/hero_sunset.jpg' },
  { id: 3, title: 'Kolkata Streets', category: 'Street', date: '25 Oct 2026', img: 'assets/images/kolkata_tram.jpg' },
  { id: 4, title: 'Green Leaves', category: 'Nature', date: '22 Oct 2026', img: 'assets/images/portfolio_macro_leaf.jpg' },
  { id: 5, title: 'Portrait Shot', category: 'Portrait', date: '20 Oct 2026', img: 'assets/images/portfolio_portrait_girl.jpg' },
  { id: 6, title: 'Night Bridge', category: 'Street', date: '18 Oct 2026', img: 'assets/images/night_bridge.jpg' },
  { id: 7, title: 'River Sunset', category: 'Travel', date: '15 Oct 2026', img: 'assets/images/portfolio_sunset_boat.jpg' },
  { id: 8, title: 'Cat Photography', category: 'Portrait', date: '12 Oct 2026', img: 'assets/images/portfolio_cat_portrait.jpg' },
  { id: 9, title: 'Alpine Solitude', category: 'Travel', date: '10 Oct 2026', img: 'assets/images/portfolio_mountain_hiker.jpg' },
  { id: 10, title: 'Lanterns of Nocturne', category: 'Street', date: '08 Oct 2026', img: 'assets/images/portfolio_night_lantern.jpg' },
  { id: 11, title: 'Golden Vows', category: 'Wedding', date: '05 Oct 2026', img: 'assets/images/portfolio_wedding.jpg' },
  { id: 12, title: 'The Sunlit Path', category: 'Street', date: '02 Oct 2026', img: 'assets/images/portfolio_ancient_street.jpg' },
  { id: 13, title: 'Whispering Ridges', category: 'Nature', date: '29 Sep 2026', img: 'assets/images/portfolio_mountain_ridge.jpg' },
  { id: 14, title: 'Ethereal Gaze', category: 'Portrait', date: '25 Sep 2026', img: 'assets/images/portfolio_portrait_girl.jpg' },
  { id: 15, title: 'Alpine Mist', category: 'Nature', date: '20 Sep 2026', img: 'assets/images/hero_slide2.jpg' },
  { id: 16, title: 'Twilight Path', category: 'Street', date: '16 Sep 2026', img: 'assets/images/hero_slide3.jpg' },
  { id: 17, title: 'Candid Portrait', category: 'Portrait', date: '12 Sep 2026', img: 'assets/images/service_portrait.jpg' },
  { id: 18, title: 'Mountain Wanderer', category: 'Travel', date: '09 Sep 2026', img: 'assets/images/service_travel.jpg' },
  { id: 19, title: 'Celebration Moments', category: 'Wedding', date: '04 Sep 2026', img: 'assets/images/service_event.jpg' },
  { id: 20, title: 'Highland Trail', category: 'Nature', date: '28 Aug 2026', img: 'assets/images/portfolio_mountain_hiker.jpg' },
  { id: 21, title: 'Serene Waters', category: 'Travel', date: '22 Aug 2026', img: 'assets/images/portfolio_sunset_boat.jpg' },
  { id: 22, title: 'Vintage Alley', category: 'Street', date: '18 Aug 2026', img: 'assets/images/portfolio_ancient_street.jpg' },
  { id: 23, title: 'Feline Stare', category: 'Portrait', date: '11 Aug 2026', img: 'assets/images/portfolio_cat_portrait.jpg' },
  { id: 24, title: 'Tropical Canopy', category: 'Nature', date: '05 Aug 2026', img: 'assets/images/portfolio_macro_leaf.jpg' }
];

// Local Storage Key
const STORAGE_KEY = 'jisnu_admin_photos';

// Application State
let photos = [];
let currentPage = 1;
const itemsPerPage = 8;
let searchQuery = '';
let selectedCategory = 'All';
let selectedSort = 'latest';
let editingPhotoId = null;
let deletingPhotoId = null;
let currentFileToUpload = null;

// Helper: Compress/downscale large image for safe local fallback (avoids localStorage 5MB limit)
function compressImageForLocal(dataUrl, maxDimension = 1400, quality = 0.75) {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      return resolve(dataUrl);
    }
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Initialize photos from LocalStorage
function initPhotos() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      photos = JSON.parse(stored);
    } catch (e) {
      photos = [...INITIAL_PHOTOS];
    }
  } else {
    photos = [...INITIAL_PHOTOS];
    savePhotos();
  }
}

function savePhotos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
  } catch (err) {
    console.warn("LocalStorage save warning (quota exceeded):", err);
    // If quota exceeded, strip raw base64 from older photos to preserve newest
    if (photos.length > 8) {
      const trimmed = photos.slice(0, 12);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch (e) {}
    }
  }
}

// Cloud Status Badge update helper
function updateCloudStatusBadge(status, count = 0, customMsg = '') {
  const badge = document.getElementById('cloudStatusBadge');
  const text = document.getElementById('cloudStatusText');
  if (!badge || !text) return;

  if (status === 'connected') {
    badge.className = 'cloud-status-badge connected';
    text.textContent = count > 0 ? `Firebase: Connected (${count} Photos)` : `Firebase: Connected`;
  } else if (status === 'syncing') {
    badge.className = 'cloud-status-badge syncing';
    text.textContent = customMsg || 'Firebase: Syncing...';
  } else if (status === 'empty') {
    badge.className = 'cloud-status-badge connected';
    text.textContent = 'Firebase: Ready (No Cloud Photos)';
  } else {
    badge.className = 'cloud-status-badge offline';
    text.textContent = customMsg || 'Firebase: Local Mode';
  }
}

// Fetch photos from Firebase Cloud Firestore with 5-second timeout
async function loadPhotosFromCloud() {
  updateCloudStatusBadge('syncing', 0, 'Firebase: Connecting...');
  try {
    const q = query(collection(db, "photos"), orderBy("createdAt", "desc"));
    const snapshot = await Promise.race([
      getDocs(q),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), 5000))
    ]);

    if (!snapshot.empty) {
      const cloudPhotos = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        cloudPhotos.push({
          id: docSnap.id,
          docId: docSnap.id,
          title: d.title || 'Untitled',
          category: d.category || 'General',
          img: d.img || 'assets/images/hero_sunset.jpg',
          date: d.date || 'Recent',
          storagePath: d.storagePath || ''
        });
      });

      photos = cloudPhotos;
      savePhotos();
      renderPhotos();
      updateCloudStatusBadge('connected', cloudPhotos.length);
    } else {
      updateCloudStatusBadge('empty', 0);
    }
  } catch (err) {
    console.warn("Firestore fetch status notice:", err.message);
    if (err.message && (err.message.includes('API key not valid') || err.message.includes('INVALID_ARGUMENT'))) {
      updateCloudStatusBadge('offline', photos.length, 'Firebase: API Key Update Required');
    } else if (err.code === 'permission-denied') {
      updateCloudStatusBadge('offline', photos.length, 'Firebase: Security Rules Pending');
    } else {
      updateCloudStatusBadge('offline', photos.length, 'Firebase: Local Cache Active');
    }
  }
}

// Filter and Sort logic
function getProcessedPhotos() {
  let result = [...photos];

  // Search filter
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    result = result.filter(p => 
      (p.title && p.title.toLowerCase().includes(q)) || 
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.date && p.date.toLowerCase().includes(q))
    );
  }

  // Category filter
  if (selectedCategory !== 'All') {
    result = result.filter(p => p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());
  }

  // Sorting
  result.sort((a, b) => {
    if (selectedSort === 'title-asc') {
      return (a.title || '').localeCompare(b.title || '');
    } else if (selectedSort === 'title-desc') {
      return (b.title || '').localeCompare(a.title || '');
    } else if (selectedSort === 'oldest') {
      return (a.id || 0) > (b.id || 0) ? 1 : -1;
    } else {
      return (b.id || 0) > (a.id || 0) ? 1 : -1;
    }
  });

  return result;
}

// Render cards
function renderPhotos() {
  const grid = document.getElementById('photoGrid');
  const paginationInfo = document.getElementById('paginationInfo');

  if (!grid) return;

  const processed = getProcessedPhotos();
  const totalCount = processed.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount);
  const pagePhotos = processed.slice(startIndex, endIndex);

  if (paginationInfo) {
    if (totalCount === 0) {
      paginationInfo.textContent = 'No photos found';
    } else {
      paginationInfo.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalCount} photos`;
    }
  }

  if (pagePhotos.length === 0) {
    grid.innerHTML = `
      <div class="empty-photos-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <p style="font-size: 1.1rem; color: #fff; margin-bottom: 8px;">No photos match your filter</p>
        <p style="font-size: 0.88rem; color: var(--admin-text-dim);">Try clearing search terms or selecting another category.</p>
      </div>
    `;
  } else {
    grid.innerHTML = pagePhotos.map(photo => {
      const safeId = String(photo.id).replace(/'/g, "\\'");
      return `
      <div class="photo-card" data-id="${photo.id}">
        <div class="card-thumb-wrap">
          <img src="${photo.img}" alt="${photo.title || 'Photograph'}" class="card-thumb-img" onerror="this.src='assets/images/hero_sunset.jpg'">
        </div>
        <div class="card-body">
          <h3 class="card-title" title="${photo.title}">${photo.title}</h3>
          <div class="card-meta-row">
            <span class="category-badge">${photo.category}</span>
            <div class="card-action-btns">
              <button class="btn-card-action edit-btn" onclick="openEditModal('${safeId}')" aria-label="Edit ${photo.title}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="btn-card-action delete-btn" onclick="openDeleteModal('${safeId}')" aria-label="Delete ${photo.title}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="card-date-row">${photo.date || 'Recent'}</div>
        </div>
      </div>
    `;
    }).join('');
  }

  renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
  const container = document.getElementById('paginationControls');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <button class="btn-page-step" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous Page">&lt;</button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button class="btn-page-num ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>
    `;
  }

  html += `
    <button class="btn-page-step" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Next Page">&gt;</button>
  `;

  container.innerHTML = html;
}

export function changePage(page) {
  currentPage = page;
  renderPhotos();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Toast notification helper
export function showToast(message, isDanger = false) {
  const toast = document.getElementById('adminToast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toast) return;

  toastMsg.textContent = message;
  toast.className = 'admin-toast show' + (isDanger ? ' danger' : '');
  setTimeout(() => {
    toast.className = 'admin-toast';
  }, 4500);
}

// Modal management
export function openAddModal() {
  editingPhotoId = null;
  currentFileToUpload = null;
  document.getElementById('photoModalTitle').textContent = 'Add New Photo';
  document.getElementById('photoForm').reset();
  document.getElementById('photoDate').value = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  resetDropzone();
  document.getElementById('photoModal').classList.add('active');
}

export function openEditModal(id) {
  const photo = photos.find(p => String(p.id) === String(id));
  if (!photo) return;

  editingPhotoId = id;
  currentFileToUpload = null;
  document.getElementById('photoModalTitle').textContent = 'Edit Photo';
  document.getElementById('photoTitle').value = photo.title;
  document.getElementById('photoCategory').value = photo.category;
  document.getElementById('photoDate').value = photo.date;
  setDropzoneImage(photo.img, photo.title);
  document.getElementById('photoModal').classList.add('active');
}

export function closePhotoModal() {
  document.getElementById('photoModal').classList.remove('active');
  currentFileToUpload = null;
}

export function openDeleteModal(id) {
  deletingPhotoId = id;
  const photo = photos.find(p => String(p.id) === String(id));
  if (!photo) return;
  document.getElementById('deletePhotoName').textContent = `"${photo.title}"`;
  document.getElementById('deleteModal').classList.add('active');
}

export function closeDeleteModal() {
  deletingPhotoId = null;
  document.getElementById('deleteModal').classList.remove('active');
}

export async function confirmDelete() {
  if (!deletingPhotoId) return;
  const photo = photos.find(p => String(p.id) === String(deletingPhotoId));
  const title = photo ? photo.title : 'Photo';

  // Delete from Cloud Firestore if it has docId
  if (photo && photo.docId) {
    try {
      await Promise.race([
        deleteDoc(doc(db, "photos", photo.docId)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Delete timeout')), 4000))
      ]);
      console.log("Deleted Firestore doc:", photo.docId);
    } catch (err) {
      console.warn("Firestore delete notice:", err.message);
    }
  }

  // Delete from Firebase Storage if it has a storage path
  if (photo && photo.storagePath) {
    try {
      const sRef = ref(storage, photo.storagePath);
      await deleteObject(sRef);
      console.log("Deleted Storage file:", photo.storagePath);
    } catch (err) {
      console.warn("Firebase Storage delete notice:", err.message);
    }
  }

  photos = photos.filter(p => String(p.id) !== String(deletingPhotoId));
  savePhotos();
  closeDeleteModal();
  renderPhotos();
  showToast(`Deleted "${title}"`, true);
  updateCloudStatusBadge('connected', photos.length);
}

// Categories Modal
export function openCategoriesModal() {
  const catModal = document.getElementById('categoriesModal');
  const list = document.getElementById('categoriesList');

  const counts = {};
  photos.forEach(p => {
    counts[p.category] = (counts[p.category] || 0) + 1;
  });

  const categories = ['Travel', 'Nature', 'Street', 'Portrait', 'Wedding'];
  list.innerHTML = categories.map(cat => `
    <div class="cat-item-row">
      <div class="cat-info">
        <span class="category-badge">${cat}</span>
        <span style="font-weight: 500; font-size: 0.95rem;">${cat} Photography</span>
      </div>
      <div class="cat-count">${counts[cat] || 0} photos</div>
    </div>
  `).join('');

  catModal.classList.add('active');
}

export function closeCategoriesModal() {
  document.getElementById('categoriesModal').classList.remove('active');
}

// Logout modal
export function openLogoutModal() {
  document.getElementById('logoutModal').classList.add('active');
}

export function closeLogoutModal() {
  document.getElementById('logoutModal').classList.remove('active');
}

export async function confirmLogout() {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn("Firebase signOut notice:", err);
  }

  localStorage.removeItem('jisnu_admin_logged_in');
  localStorage.removeItem('jisnu_admin_email');
  localStorage.removeItem('jisnu_admin_uid');
  localStorage.removeItem('jisnu_admin_user');

  showToast('Logging out... Redirecting to login portal');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 700);
}

// Helper: Set Dropzone image and preview
export function setDropzoneImage(src, name) {
  const photoImg = document.getElementById('photoImg');
  const photoPreviewImg = document.getElementById('photoPreviewImg');
  const uploadFileName = document.getElementById('uploadFileName');
  const dropzoneEmpty = document.getElementById('dropzoneEmpty');
  const dropzonePreview = document.getElementById('dropzonePreview');

  if (photoImg) photoImg.value = src;
  if (photoPreviewImg) photoPreviewImg.src = src;
  if (uploadFileName) uploadFileName.textContent = name || 'photo.jpg';

  if (dropzoneEmpty) dropzoneEmpty.style.display = 'none';
  if (dropzonePreview) dropzonePreview.style.display = 'flex';
}

// Helper: Reset Dropzone to empty upload prompt
export function resetDropzone() {
  const photoImg = document.getElementById('photoImg');
  const photoFileInput = document.getElementById('photoFileInput');
  const dropzoneEmpty = document.getElementById('dropzoneEmpty');
  const dropzonePreview = document.getElementById('dropzonePreview');
  const presetSelect = document.getElementById('photoPreset');

  if (photoImg) photoImg.value = '';
  if (photoFileInput) photoFileInput.value = '';
  if (presetSelect) presetSelect.value = '';

  if (dropzoneEmpty) dropzoneEmpty.style.display = 'flex';
  if (dropzonePreview) dropzonePreview.style.display = 'none';
  currentFileToUpload = null;
}

export function openSidebar() {
  const adminSidebar = document.getElementById('adminSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  if (adminSidebar) adminSidebar.classList.add('open');
  if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function closeSidebar() {
  const adminSidebar = document.getElementById('adminSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  if (adminSidebar) adminSidebar.classList.remove('open');
  if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
  document.body.style.overflow = '';
}

// Expose all functions to global window object for inline HTML onclick attributes
window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.closePhotoModal = closePhotoModal;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
window.openCategoriesModal = openCategoriesModal;
window.closeCategoriesModal = closeCategoriesModal;
window.openLogoutModal = openLogoutModal;
window.closeLogoutModal = closeLogoutModal;
window.confirmLogout = confirmLogout;
window.changePage = changePage;
window.setDropzoneImage = setDropzoneImage;
window.resetDropzone = resetDropzone;
window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;

// Event Listeners & Auth Protection
function initAdmin() {
  initPhotos();
  renderPhotos();

  // Auth Protection Listener
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("Firebase Auth Active:", user.email);
      const userRoleEl = document.querySelector('.admin-role-text');
      if (userRoleEl) userRoleEl.textContent = user.email.split('@')[0];
    } else {
      if (!localStorage.getItem('jisnu_admin_logged_in')) {
        console.warn("Unauthenticated admin visit, redirecting to login.html");
        window.location.href = 'login.html';
      }
    }
  });

  // Load photos from Firestore
  loadPhotosFromCloud();

  // Search input live filter
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      currentPage = 1;
      renderPhotos();
    });
  }

  // Category select filter
  const categorySelect = document.getElementById('categorySelect');
  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      selectedCategory = e.target.value;
      currentPage = 1;
      renderPhotos();
    });
  }

  // Sort select
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      selectedSort = e.target.value;
      renderPhotos();
    });
  }

  // File Upload Dropzone Listeners
  const uploadDropzone = document.getElementById('uploadDropzone');
  const photoFileInput = document.getElementById('photoFileInput');
  const btnChangePhoto = document.getElementById('btnChangePhoto');

  if (uploadDropzone && photoFileInput) {
    uploadDropzone.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'btnChangePhoto') return;
      photoFileInput.click();
    });

    if (btnChangePhoto) {
      btnChangePhoto.addEventListener('click', (e) => {
        e.stopPropagation();
        photoFileInput.click();
      });
    }

    ['dragenter', 'dragover'].forEach(eventName => {
      uploadDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadDropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'dragend', 'drop'].forEach(eventName => {
      uploadDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadDropzone.classList.remove('drag-over');
      });
    });

    uploadDropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleImageFile(files[0]);
      }
    });

    photoFileInput.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleImageFile(files[0]);
      }
    });
  }

  function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (JPG, PNG, WEBP)', true);
      return;
    }

    currentFileToUpload = file;

    const reader = new FileReader();
    reader.onload = function(evt) {
      const dataUrl = evt.target.result;
      const fileSize = (file.size / (1024 * 1024)).toFixed(2);
      setDropzoneImage(dataUrl, `${file.name} (${fileSize} MB)`);
      showToast(`Selected "${file.name}" for upload`);
    };
    reader.readAsDataURL(file);
  }

  // Quick Preset Selection Alternative
  const presetSelect = document.getElementById('photoPreset');
  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        const text = e.target.options[e.target.selectedIndex].text;
        setDropzoneImage(e.target.value, text);
        currentFileToUpload = null;
      }
    });
  }

  // Form submit (Add or Edit with resilient Cloud + Local fallback & safe timeouts)
  const photoForm = document.getElementById('photoForm');
  if (photoForm) {
    photoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = photoForm.querySelector('button[type="submit"]');
      const originalSaveBtnText = saveBtn ? saveBtn.innerHTML : 'Save Photo';

      const title = document.getElementById('photoTitle').value.trim();
      const category = document.getElementById('photoCategory').value;
      let img = document.getElementById('photoImg').value.trim();
      const date = document.getElementById('photoDate').value.trim() || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      if (!img && !currentFileToUpload) {
        showToast('Please upload an image before saving!', true);
        return;
      }

      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span>Saving Photo...</span>`;
      }

      let storagePath = '';
      let cloudUploaded = false;

      try {
        // 1. If a direct file was chosen, save it to server /api/upload & attempt Firebase Storage
        if (currentFileToUpload) {
          // A. Save to local server /api/upload folder
          try {
            updateCloudStatusBadge('syncing', 0, 'Saving image file...');
            const uploadResponse = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filename: currentFileToUpload.name,
                data: img
              })
            });
            const uploadResult = await uploadResponse.json();
            if (uploadResult && uploadResult.success) {
              img = uploadResult.url;
              console.log("[Upload] Saved image to:", img);
            }
          } catch (uploadErr) {
            console.warn("[Upload] Local server upload notice:", uploadErr);
          }

          // B. Attempt Firebase Cloud Storage upload
          try {
            const cleanName = currentFileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const uniquePath = `photos/${Date.now()}_${cleanName}`;
            const storageRef = ref(storage, uniquePath);

            const uploadTask = uploadBytes(storageRef, currentFileToUpload);
            const uploadRes = await Promise.race([
              uploadTask,
              new Promise((_, reject) => setTimeout(() => reject(new Error('Storage timeout or CORS')), 2500))
            ]);

            img = await getDownloadURL(uploadRes.ref);
            storagePath = uniquePath;
            cloudUploaded = true;
            console.log("[Firebase Storage] Uploaded to cloud:", img);
          } catch (storageErr) {
            console.warn('[Firebase Storage] Notice (CORS or permissions):', storageErr.message || storageErr);
          }
        }

        // 2. Add or Edit photo
        if (editingPhotoId) {
          const p = photos.find(item => String(item.id) === String(editingPhotoId));
          if (p) {
            p.title = title;
            p.category = category;
            p.img = img;
            p.date = date;
            if (storagePath) p.storagePath = storagePath;

            if (p.docId) {
              try {
                await Promise.race([
                  updateDoc(doc(db, "photos", p.docId), {
                    title,
                    category,
                    img,
                    date,
                    updatedAt: serverTimestamp()
                  }),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 4000))
                ]);
              } catch (err) {
                console.warn("Firestore update notice:", err.message);
              }
            }
            savePhotos();
            showToast(`Updated "${title}"`);
          }
        } else {
          // Always save to Cloud Firestore so document appears in Firebase Console!
          let newDocId = null;
          try {
            showToast('Saving to Cloud Firestore...', false);
            const docRef = await Promise.race([
              addDoc(collection(db, "photos"), {
                title,
                category,
                img,
                date,
                storagePath: storagePath || '',
                createdAt: serverTimestamp()
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 4500))
            ]);
            newDocId = docRef.id;
            cloudUploaded = true;
            console.log("✓ Saved photo doc to Cloud Firestore with ID:", newDocId);
            showToast(`Photo "${title}" saved to Cloud Firestore!`);
          } catch (dbErr) {
            console.warn("Firestore addDoc notice:", dbErr.message);
            showToast(`Photo "${title}" saved successfully!`);
          }

          const newId = newDocId || (photos.length > 0 ? Math.max(...photos.filter(p => typeof p.id === 'number').map(p => p.id), 0) + 1 : 1);
          const newPhoto = {
            id: newId,
            docId: newDocId,
            title,
            category,
            img,
            date,
            storagePath: storagePath || ''
          };
          photos.unshift(newPhoto);
          savePhotos();
        }

      } catch (err) {
        console.error("Save photo error:", err);
        showToast('Saved photo locally (' + err.message + ')', true);
      } finally {
        // ALWAYS unfreeze UI, reset button, and close modal
        currentFileToUpload = null;
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalSaveBtnText;
        }
        closePhotoModal();
        renderPhotos();
        updateCloudStatusBadge(cloudUploaded ? 'connected' : 'offline', photos.length);
      }
    });
  }

  // Close modals on escape key or clicking backdrop
  document.querySelectorAll('.admin-modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.admin-modal-overlay.active').forEach(m => m.classList.remove('active'));
      closeSidebar();
    }
  });

  const mobileToggleEl = document.getElementById('adminMobileToggle');
  const sidebarCloseBtnEl = document.getElementById('sidebarCloseBtn');
  const sidebarBackdropEl = document.getElementById('sidebarBackdrop');

  if (mobileToggleEl) {
    mobileToggleEl.addEventListener('click', openSidebar);
  }

  if (sidebarCloseBtnEl) {
    sidebarCloseBtnEl.addEventListener('click', closeSidebar);
  }

  if (sidebarBackdropEl) {
    sidebarBackdropEl.addEventListener('click', closeSidebar);
  }

  document.querySelectorAll('.admin-sidebar .nav-item-btn, .admin-sidebar .btn-logout').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 992) {
        closeSidebar();
      }
    });
  });
}

// Trigger initAdmin reliably on all load states
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}
