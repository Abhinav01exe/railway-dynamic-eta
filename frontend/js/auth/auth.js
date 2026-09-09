/**
 * AdaptRail Authentication & User Profile Management
 * Provides client-side user sessions, Google Sign-In simulation,
 * saved train watchlist, and live delay alert preferences with localStorage persistence.
 */

(function() {
  window.AdaptRail = window.AdaptRail || {};

  const AUTH_STORAGE_KEY = "adaptrail_user_session";
  const WATCHLIST_STORAGE_KEY = "adaptrail_watchlist";
  const ALERTS_STORAGE_KEY = "adaptrail_alerts";

  // Default guest/initial state
  let currentUser = null;
  let watchlist = ["12302", "22436"]; // Default favorites
  let alertPreferences = {
    thresholdMins: 15,
    emailAlerts: true,
    browserNotifications: true
  };

  function initAuth() {
    loadSession();
    loadWatchlist();
    loadAlerts();
    renderAuthUI();
    setupAuthListeners();
  }

  function loadSession() {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        currentUser = JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load user session", e);
    }
  }

  function saveSession(user) {
    currentUser = user;
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.error("Failed to save session", e);
    }
    renderAuthUI();
  }

  function loadWatchlist() {
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (saved) {
        watchlist = JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load watchlist", e);
    }
  }

  function saveWatchlist() {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    } catch (e) {
      console.error("Failed to save watchlist", e);
    }
  }

  function loadAlerts() {
    try {
      const saved = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (saved) {
        alertPreferences = JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load alerts", e);
    }
  }

  function saveAlerts() {
    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alertPreferences));
    } catch (e) {
      console.error("Failed to save alerts", e);
    }
  }

  // Watchlist methods
  function isTrainInWatchlist(trainId) {
    return watchlist.includes(trainId);
  }

  function toggleWatchlist(trainId) {
    if (!currentUser) {
      openAuthModal("signin", "Please sign in to save trains to your watchlist.");
      return false;
    }
    const idx = watchlist.indexOf(trainId);
    if (idx > -1) {
      watchlist.splice(idx, 1);
      showNotification(`Removed train ${trainId} from your watchlist`, "info");
    } else {
      watchlist.push(trainId);
      showNotification(`Added train ${trainId} to your watchlist ⭐`, "success");
    }
    saveWatchlist();
    updateWatchlistUI();
    return watchlist.includes(trainId);
  }

  // Render Auth UI in Navbar & Modals
  function renderAuthUI() {
    const authBtnContainer = document.getElementById("navbarAuthArea");
    if (!authBtnContainer) return;

    if (currentUser) {
      const initials = currentUser.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
      authBtnContainer.innerHTML = `
        <div class="user-profile-menu">
          <button id="userProfileBtn" class="btn-profile-badge" title="User Profile">
            <span class="user-avatar-circle">${initials}</span>
            <span class="user-display-name">${currentUser.name}</span>
            <span class="dropdown-caret">▼</span>
          </button>
          <div id="userDropdownPanel" class="user-dropdown-panel hidden">
            <div class="dropdown-user-header">
              <div class="dropdown-user-name">${currentUser.name}</div>
              <div class="dropdown-user-email">${currentUser.email}</div>
              <span class="user-plan-badge">Verified Commuter</span>
            </div>
            <div class="dropdown-divider"></div>
            <button id="btnOpenWatchlistModal" class="dropdown-item">
              ⭐ My Saved Trains (${watchlist.length})
            </button>
            <button id="btnOpenAlertsModal" class="dropdown-item">
              🔔 Delay Alert Settings
            </button>
            <div class="dropdown-divider"></div>
            <button id="btnLogout" class="dropdown-item text-danger">
              🚪 Sign Out
            </button>
          </div>
        </div>
      `;

      // Profile menu toggle
      const profBtn = document.getElementById("userProfileBtn");
      const dropPanel = document.getElementById("userDropdownPanel");
      if (profBtn && dropPanel) {
        profBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          dropPanel.classList.toggle("hidden");
        });
      }

      const logoutBtn = document.getElementById("btnLogout");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
          saveSession(null);
          showNotification("You have signed out successfully.", "info");
        });
      }

      const openWatchlistBtn = document.getElementById("btnOpenWatchlistModal");
      if (openWatchlistBtn) {
        openWatchlistBtn.addEventListener("click", () => {
          if (dropPanel) dropPanel.classList.add("hidden");
          openWatchlistModal();
        });
      }

      const openAlertsBtn = document.getElementById("btnOpenAlertsModal");
      if (openAlertsBtn) {
        openAlertsBtn.addEventListener("click", () => {
          if (dropPanel) dropPanel.classList.add("hidden");
          openAlertsModal();
        });
      }

    } else {
      authBtnContainer.innerHTML = `
        <button id="btnOpenSignInModal" class="btn-signin-nav">
          <span class="icon-user">👤</span> Sign In / Register
        </button>
      `;

      const signInBtn = document.getElementById("btnOpenSignInModal");
      if (signInBtn) {
        signInBtn.addEventListener("click", () => {
          openAuthModal("signin");
        });
      }
    }

    updateWatchlistUI();
  }

  // Update Watchlist UI elements on page
  function updateWatchlistUI() {
    const starBtn = document.getElementById("btnStarTrain");
    if (starBtn && window.RailwayETA && window.RailwayETA.appState) {
      const trainId = window.RailwayETA.appState.currentTrainId;
      const isStarred = isTrainInWatchlist(trainId);
      starBtn.classList.toggle("active", isStarred);
      starBtn.innerHTML = isStarred ? "★ In Watchlist" : "☆ Save to Watchlist";
      starBtn.title = isStarred ? "Remove from Watchlist" : "Save this train to your Watchlist for instant tracking";
    }
  }

  function setupAuthListeners() {
    // Close dropdowns on outside click
    document.addEventListener("click", () => {
      const dropPanel = document.getElementById("userDropdownPanel");
      if (dropPanel) dropPanel.classList.add("hidden");
    });

    // Star button listener
    const starBtn = document.getElementById("btnStarTrain");
    if (starBtn) {
      starBtn.addEventListener("click", () => {
        if (window.RailwayETA && window.RailwayETA.appState) {
          toggleWatchlist(window.RailwayETA.appState.currentTrainId);
        }
      });
    }

    // Modal Close buttons
    const closeAuthBtn = document.getElementById("btnCloseAuthModal");
    const authOverlay = document.getElementById("authModalOverlay");
    if (closeAuthBtn && authOverlay) {
      closeAuthBtn.addEventListener("click", () => closeAuthModal());
      authOverlay.addEventListener("click", (e) => {
        if (e.target === authOverlay) closeAuthModal();
      });
    }

    // Tab switching (Sign In vs Create Account)
    const tabSignIn = document.getElementById("tabSignIn");
    const tabSignUp = document.getElementById("tabSignUp");
    const formSignIn = document.getElementById("formSignIn");
    const formSignUp = document.getElementById("formSignUp");

    if (tabSignIn && tabSignUp && formSignIn && formSignUp) {
      tabSignIn.addEventListener("click", () => {
        tabSignIn.classList.add("active");
        tabSignUp.classList.remove("active");
        formSignIn.classList.remove("hidden");
        formSignUp.classList.add("hidden");
      });

      tabSignUp.addEventListener("click", () => {
        tabSignUp.classList.add("active");
        tabSignIn.classList.remove("active");
        formSignUp.classList.remove("hidden");
        formSignIn.classList.add("hidden");
      });
    }

    // Form Submissions
    if (formSignIn) {
      formSignIn.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("signInEmail").value.trim();
        const name = email.split("@")[0] || "Commuter";
        saveSession({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          email: email,
          method: "email"
        });
        closeAuthModal();
        showNotification(`Welcome back, ${name}!`, "success");
      });
    }

    if (formSignUp) {
      formSignUp.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("signUpName").value.trim();
        const email = document.getElementById("signUpEmail").value.trim();
        saveSession({
          name: name || "Commuter",
          email: email,
          method: "email"
        });
        closeAuthModal();
        showNotification(`Account created successfully! Welcome to AdaptRail, ${name}!`, "success");
      });
    }

    // Google Login Simulation
    const googleBtns = document.querySelectorAll(".btn-google-auth");
    googleBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        saveSession({
          name: "Mahendra Kumar",
          email: "mahendra.railway@gmail.com",
          method: "google"
        });
        closeAuthModal();
        showNotification("Signed in via Google as Mahendra Kumar", "success");
      });
    });

    // 1-Click Demo Login
    const demoBtns = document.querySelectorAll(".btn-demo-auth");
    demoBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        saveSession({
          name: "Rajesh Sharma",
          email: "rajesh.sharma@adaptrail.in",
          method: "demo"
        });
        closeAuthModal();
        showNotification("Signed in with Demo Commuter Account", "success");
      });
    });

    // Watchlist Modal Close
    const closeWatchlistBtn = document.getElementById("btnCloseWatchlistModal");
    const watchlistOverlay = document.getElementById("watchlistModalOverlay");
    if (closeWatchlistBtn && watchlistOverlay) {
      closeWatchlistBtn.addEventListener("click", () => watchlistOverlay.classList.add("hidden"));
      watchlistOverlay.addEventListener("click", (e) => {
        if (e.target === watchlistOverlay) watchlistOverlay.classList.add("hidden");
      });
    }

    // Alerts Modal Close & Save
    const closeAlertsBtn = document.getElementById("btnCloseAlertsModal");
    const alertsOverlay = document.getElementById("alertsModalOverlay");
    const formAlerts = document.getElementById("formAlerts");
    if (closeAlertsBtn && alertsOverlay) {
      closeAlertsBtn.addEventListener("click", () => alertsOverlay.classList.add("hidden"));
      alertsOverlay.addEventListener("click", (e) => {
        if (e.target === alertsOverlay) alertsOverlay.classList.add("hidden");
      });
    }
    if (formAlerts) {
      formAlerts.addEventListener("submit", (e) => {
        e.preventDefault();
        const threshold = parseInt(document.getElementById("alertThresholdInput").value, 10) || 15;
        const emailNotif = document.getElementById("alertEmailCheck").checked;
        const pushNotif = document.getElementById("alertPushCheck").checked;
        alertPreferences = {
          thresholdMins: threshold,
          emailAlerts: emailNotif,
          browserNotifications: pushNotif
        };
        saveAlerts();
        alertsOverlay.classList.add("hidden");
        showNotification(`Saved delay alert preferences (Alert if delay > ${threshold} mins)`, "success");
      });
    }
  }

  function openAuthModal(defaultTab = "signin", message = "") {
    const modal = document.getElementById("authModalOverlay");
    if (!modal) return;

    const noticeEl = document.getElementById("authModalNotice");
    if (noticeEl) {
      if (message) {
        noticeEl.textContent = message;
        noticeEl.classList.remove("hidden");
      } else {
        noticeEl.classList.add("hidden");
      }
    }

    const tabSignIn = document.getElementById("tabSignIn");
    const tabSignUp = document.getElementById("tabSignUp");
    const formSignIn = document.getElementById("formSignIn");
    const formSignUp = document.getElementById("formSignUp");

    if (defaultTab === "signin") {
      if (tabSignIn) tabSignIn.classList.add("active");
      if (tabSignUp) tabSignUp.classList.remove("active");
      if (formSignIn) formSignIn.classList.remove("hidden");
      if (formSignUp) formSignUp.classList.add("hidden");
    } else {
      if (tabSignUp) tabSignUp.classList.add("active");
      if (tabSignIn) tabSignIn.classList.remove("active");
      if (formSignUp) formSignUp.classList.remove("hidden");
      if (formSignIn) formSignIn.classList.add("hidden");
    }

    modal.classList.remove("hidden");
  }

  function closeAuthModal() {
    const modal = document.getElementById("authModalOverlay");
    if (modal) modal.classList.add("hidden");
  }

  function openWatchlistModal() {
    const overlay = document.getElementById("watchlistModalOverlay");
    const listContainer = document.getElementById("watchlistItemsContainer");
    if (!overlay || !listContainer) return;

    const allTrains = (window.RailwayETA && window.RailwayETA.TRAINS_DATABASE) || [];
    const savedTrains = allTrains.filter(t => watchlist.includes(t.id));

    if (savedTrains.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-watchlist-msg">
          <span class="empty-icon">⭐</span>
          <p>No saved trains yet.</p>
          <span class="empty-subtext">Click "☆ Save to Watchlist" on any train to track it with one click.</span>
        </div>
      `;
    } else {
      listContainer.innerHTML = savedTrains.map(train => `
        <div class="watchlist-train-row" data-train-id="${train.id}">
          <div class="wl-train-info">
            <span class="wl-train-num">${train.number}</span>
            <span class="wl-train-name">${train.name}</span>
            <span class="wl-train-route">${train.origin} ➔ ${train.destination}</span>
          </div>
          <div class="wl-actions">
            <button class="btn-wl-view" data-train-id="${train.id}">Track Live 🚆</button>
            <button class="btn-wl-remove" data-train-id="${train.id}" title="Remove from Watchlist">✕</button>
          </div>
        </div>
      `).join("");

      // Add click handlers
      listContainer.querySelectorAll(".btn-wl-view").forEach(btn => {
        btn.addEventListener("click", () => {
          const trainId = btn.dataset.trainId;
          const select = document.getElementById("trainSelect");
          if (select) {
            select.value = trainId;
            select.dispatchEvent(new Event("change"));
          }
          overlay.classList.add("hidden");
        });
      });

      listContainer.querySelectorAll(".btn-wl-remove").forEach(btn => {
        btn.addEventListener("click", () => {
          const trainId = btn.dataset.trainId;
          toggleWatchlist(trainId);
          openWatchlistModal(); // re-render list
        });
      });
    }

    overlay.classList.remove("hidden");
  }

  function openAlertsModal() {
    const overlay = document.getElementById("alertsModalOverlay");
    if (!overlay) return;

    const thresholdInput = document.getElementById("alertThresholdInput");
    const thresholdVal = document.getElementById("alertThresholdVal");
    const emailCheck = document.getElementById("alertEmailCheck");
    const pushCheck = document.getElementById("alertPushCheck");

    if (thresholdInput && thresholdVal) {
      thresholdInput.value = alertPreferences.thresholdMins;
      thresholdVal.textContent = `> ${alertPreferences.thresholdMins} min delay`;
      thresholdInput.oninput = (e) => {
        thresholdVal.textContent = `> ${e.target.value} min delay`;
      };
    }
    if (emailCheck) emailCheck.checked = alertPreferences.emailAlerts;
    if (pushCheck) pushCheck.checked = alertPreferences.browserNotifications;

    overlay.classList.remove("hidden");
  }

  // Toast notification system
  function showNotification(message, type = "info") {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast-pill ${type}`;
    toast.innerHTML = `
      <span class="toast-dot"></span>
      <span class="toast-msg">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("toast-fade-out");
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  // Expose methods on window
  window.AdaptRail.initAuth = initAuth;
  window.AdaptRail.openAuthModal = openAuthModal;
  window.AdaptRail.closeAuthModal = closeAuthModal;
  window.AdaptRail.toggleWatchlist = toggleWatchlist;
  window.AdaptRail.showNotification = showNotification;
  window.AdaptRail.updateWatchlistUI = updateWatchlistUI;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
  } else {
    initAuth();
  }
})();
