/**
 * nostr-post Example Application
 *
 * Demonstrates how to use @nostr-post/web with nostr-login
 */

import "@nostr-post/web";
import type { NostrPostComposer, NostrPostView } from "@nostr-post/web";
import type {
  NostrPostManifest,
  EventBundle,
  UnsignedNostrEvent,
} from "@nostr-post/core/types";

// Simple Kind 1 post manifest
const simplePostManifest: NostrPostManifest = {
  id: "simple-post-v1",
  version: "1.0.0",
  requiredKinds: [1],
  fields: [
    {
      id: "content",
      type: "string",
      uiPlugin: "textarea",
      mapTo: { kind: 1, target: "content" },
      required: true,
    },
  ],
  metadata: {
    name: "Simple Post",
    description: "Create a basic Nostr note (Kind 1)",
    author: "nostr-post",
    tags: ["post", "note"],
  },
};

// Application state
const state = {
  pubkey: "",
  events: [] as UnsignedNostrEvent[],
  searchFilter: "",
};

/**
 * Show status message
 */
function showStatus(message: string, type: "success" | "error") {
  const container = document.getElementById("status-container");
  if (!container) return;

  const div = document.createElement("div");
  div.className = `status-message status-${type}`;
  div.textContent = message;
  container.appendChild(div);

  setTimeout(() => {
    div.remove();
  }, 5000);
}

/**
 * Initialize nostr-login
 */
function initNostrLogin() {
  // Initialize nostr-login with full configuration
  nlInit({
    // Enable all login methods including bunker
    methods: ["extension", "bunker", "local", "signup"],
    // Configure bunker providers
    bunkers: "nsec.app,highlighter.com",
    // Request permissions for events
    perms: "sign_event:1,sign_event:0",
    // Configure relays
    relays: ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.nostr.band"],
    // Theme
    theme: "default",
  });

  // Get the nl-auth widget (already in HTML)
  const nlWidget = document.querySelector("nl-auth");
  if (!nlWidget) {
    console.error("nl-auth element not found");
    return;
  }

  // Listen for any login-related events
  nlWidget.addEventListener("nlAuth", ((event: CustomEvent) => {
    console.log("✅ nostr-login nlAuth event:", event.detail);
    const { type } = event.detail;

    if (type === "login" || type === "signup") {
      // Trigger our handleLogin which will use window.nostr
      setTimeout(() => handleLogin(), 100);
    } else if (type === "logout") {
      handleLogout();
    }
  }) as EventListener);

  console.log("nostr-login initialized with bunker support and relays");
}

/**
 * Handle user login
 */
async function handleLogin() {
  try {
    // Try to get pubkey from window.nostr (browser extension)
    const nostr = (window as any).nostr;

    if (!nostr) {
      showStatus(
        "Please install a Nostr browser extension (Alby, nos2x, etc.)",
        "error"
      );
      return;
    }

    const pubkey = await nostr.getPublicKey();

    if (!pubkey) {
      throw new Error("Failed to get pubkey");
    }

    state.pubkey = pubkey;
    console.log("✅ Logged in with pubkey:", pubkey);

    // Hide login section
    const loginSection = document.getElementById("login-section");
    if (loginSection) {
      loginSection.style.display = "none";
    }

    // Show main content
    const mainContent = document.getElementById("main-content");
    if (mainContent) {
      mainContent.style.display = "grid";
    }

    // Initialize composer
    initComposer();

    // Load events
    await loadEvents();

    showStatus("Successfully connected!", "success");
  } catch (error) {
    console.error("Login error:", error);
    showStatus("Failed to connect. Please try again.", "error");
  }
}

/**
 * Handle user logout
 */
function handleLogout() {
  state.pubkey = "";
  state.events = [];

  const mainContent = document.getElementById("main-content");
  if (mainContent) {
    mainContent.style.display = "none";
  }

  const loginSection = document.getElementById("login-section");
  if (loginSection) {
    loginSection.style.display = "block";
  }
}

/**
 * Initialize the composer component
 */
function initComposer() {
  const composer = document.getElementById("composer") as NostrPostComposer;
  if (!composer) return;

  // Set manifest and pubkey
  composer.manifest = simplePostManifest;
  composer.pubkey = state.pubkey;

  // Listen for submit event
  composer.addEventListener("nostr-post-submit", async (e: Event) => {
    const customEvent = e as CustomEvent<{ bundle: EventBundle }>;
    const { bundle } = customEvent.detail;

    try {
      // Sign and publish events
      await signAndPublishEvents(bundle);

      showStatus("Post published successfully!", "success");

      // Refresh events list
      await loadEvents();
    } catch (error) {
      console.error("Publish error:", error);
      showStatus("Failed to publish post", "error");
    }
  });

  // Listen for error event
  composer.addEventListener("nostr-post-error", (e: Event) => {
    const customEvent = e as CustomEvent<{ message: string }>;
    showStatus(customEvent.detail.message, "error");
  });
}

/**
 * Sign and publish events using nostr-login
 */
async function signAndPublishEvents(bundle: EventBundle) {
  const nostrLogin = (window as any).nostrLogin;

  if (!nostrLogin) {
    throw new Error("nostr-login not available");
  }

  for (const event of bundle.events) {
    try {
      // Sign the event
      const signedEvent = await nostrLogin.signEvent(event);

      // Publish to relays
      await nostrLogin.publish(signedEvent);

      // Add to local state (for demo purposes)
      state.events.unshift(signedEvent);
    } catch (error) {
      console.error("Failed to sign/publish event:", error);
      throw error;
    }
  }
}

/**
 * Load events from relays
 */
async function loadEvents() {
  try {
    const nostrLogin = (window as any).nostrLogin;

    if (!nostrLogin) {
      return;
    }

    // For demo purposes, just show locally created events
    // In a real app, you'd query relays here
    renderEvents();
  } catch (error) {
    console.error("Failed to load events:", error);
    showStatus("Failed to load events", "error");
  }
}

/**
 * Render events list
 */
function renderEvents() {
  const eventsList = document.getElementById("events-list");
  if (!eventsList) return;

  // Filter events
  let filteredEvents = state.events;
  if (state.searchFilter) {
    const search = state.searchFilter.toLowerCase();
    filteredEvents = state.events.filter((event) =>
      event.content.toLowerCase().includes(search)
    );
  }

  // Clear list
  eventsList.innerHTML = "";

  if (filteredEvents.length === 0) {
    eventsList.innerHTML = `
      <div class="empty-state">
        <p>${
          state.searchFilter
            ? "No posts match your search"
            : "No posts yet. Create your first post above!"
        }</p>
      </div>
    `;
    return;
  }

  // Render each event
  for (const event of filteredEvents) {
    const view = document.createElement("nostr-post-view") as NostrPostView;
    view.event = event;
    eventsList.appendChild(view);
  }
}

/**
 * Initialize filter controls
 */
function initFilters() {
  const searchInput = document.getElementById(
    "filter-search"
  ) as HTMLInputElement;
  const refreshBtn = document.getElementById("refresh-btn");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchFilter = (e.target as HTMLInputElement).value;
      renderEvents();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadEvents();
    });
  }
}

/**
 * Initialize the application
 */
function init() {
  console.log("🚀 App initializing...");

  initNostrLogin();
  initFilters();
}

// Start the app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
