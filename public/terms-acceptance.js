(function () {
  const TERMS_ACCEPTANCE_VERSION = "2026";
  const TERMS_STORAGE_KEY = `lolscript-terms-accepted-${TERMS_ACCEPTANCE_VERSION}`;

  function isAccepted() {
    try {
      return localStorage.getItem(TERMS_STORAGE_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function setAccepted(value) {
    try {
      if (value) localStorage.setItem(TERMS_STORAGE_KEY, "1");
      else localStorage.removeItem(TERMS_STORAGE_KEY);
    } catch (_) {}
    window.dispatchEvent(new CustomEvent("lolscript-terms-change", { detail: { accepted: Boolean(value) } }));
  }

  function bindCheckbox(input) {
    if (!input || input.dataset.termsBound === "true") return;
    input.dataset.termsBound = "true";
    input.checked = isAccepted();
    input.addEventListener("change", () => setAccepted(input.checked));
  }

  window.LOLScriptTerms = {
    version: TERMS_ACCEPTANCE_VERSION,
    storageKey: TERMS_STORAGE_KEY,
    isAccepted,
    setAccepted,
    bindCheckbox,
  };
})();
