const LOL_CURRENCY_KEY = "lolscript_currency";
const LOL_RATES_KEY = "lolscript_currency_rates";
const LOL_RATES_TTL = 12 * 60 * 60 * 1000;

const LOL_CURRENCIES = [
  ["USD", "US Dollar"],
  ["EUR", "Euro"],
  ["GBP", "British Pound"],
  ["CAD", "Canadian Dollar"],
  ["AUD", "Australian Dollar"],
  ["NZD", "New Zealand Dollar"],
  ["MXN", "Mexican Peso"],
  ["BRL", "Brazilian Real"],
  ["PHP", "Philippine Peso"],
  ["INR", "Indian Rupee"],
  ["JPY", "Japanese Yen"],
  ["KRW", "South Korean Won"],
  ["CNY", "Chinese Yuan"],
];

const LOL_FALLBACK_RATES = {
  USD: 1,
  EUR: 0.93,
  GBP: 0.8,
  CAD: 1.37,
  AUD: 1.52,
  NZD: 1.66,
  MXN: 17,
  BRL: 5.1,
  PHP: 57,
  INR: 83,
  JPY: 154,
  KRW: 1370,
  CNY: 7.24,
};

const LOLCurrency = (() => {
  let currency = localStorage.getItem(LOL_CURRENCY_KEY) || "USD";
  let rates = { ...LOL_FALLBACK_RATES };

  function readCachedRates() {
    try {
      const cached = JSON.parse(localStorage.getItem(LOL_RATES_KEY) || "null");
      if (!cached || Date.now() - Number(cached.updatedAt || 0) > LOL_RATES_TTL) return;
      if (cached.rates && typeof cached.rates === "object") rates = { ...rates, ...cached.rates, USD: 1 };
    } catch (_) {}
  }

  async function refreshRates() {
    readCachedRates();
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
      if (!response.ok) throw new Error("rate fetch failed");
      const payload = await response.json();
      if (!payload.rates) throw new Error("missing rates");
      const supported = {};
      LOL_CURRENCIES.forEach(([code]) => {
        if (Number(payload.rates[code]) > 0) supported[code] = Number(payload.rates[code]);
      });
      rates = { ...rates, ...supported, USD: 1 };
      localStorage.setItem(LOL_RATES_KEY, JSON.stringify({ updatedAt: Date.now(), rates }));
      apply();
    } catch (_) {
      apply();
    }
  }

  function formatCents(usdCents) {
    const amount = (Number(usdCents || 0) / 100) * (rates[currency] || 1);
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: ["JPY", "KRW"].includes(currency) ? 0 : 2,
      maximumFractionDigits: ["JPY", "KRW"].includes(currency) ? 0 : 2,
    }).format(amount);
  }

  function apply(root = document) {
    root.querySelectorAll("[data-money-usd-cents]").forEach((element) => {
      element.textContent = formatCents(element.dataset.moneyUsdCents);
    });
    document.querySelectorAll("[data-currency-select]").forEach((select) => {
      select.value = currency;
    });
  }

  function mountSelectors() {
    document.querySelectorAll("[data-currency-select]").forEach((select) => {
      if (!select.options.length) {
        LOL_CURRENCIES.forEach(([code, label]) => {
          select.append(new Option(`${code} - ${label}`, code));
        });
      }
      select.value = currency;
      select.addEventListener("change", () => {
        currency = select.value || "USD";
        localStorage.setItem(LOL_CURRENCY_KEY, currency);
        apply();
        window.dispatchEvent(new CustomEvent("lolcurrencychange", { detail: { currency } }));
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    mountSelectors();
    readCachedRates();
    apply();
    refreshRates();
  });

  return { apply, formatCents, refreshRates };
})();

window.LOLCurrency = LOLCurrency;
