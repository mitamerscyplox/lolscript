// Card and page content for the products built by scripts/build-product-pages.mjs.
// The original LoL Script, Vanguard Emulator and Perm Spoofer pages are hand-written and not listed here.
// Prices are display fallbacks; live prices and plans come from Sellhub (api/_lib/store-catalog.mjs).

const EMULATORS = '<a href="/#vanguard-bypass">Vanguard emulator</a>';

const needsEmulator = (name) => ({
  q: `Does ${name} need a Vanguard emulator?`,
  a: `Yes. ${name} loads while Riot Vanguard is not running, so you need an active ${EMULATORS} such as <a href="/oxa-vanguard-emulator">OXA</a> or <a href="/soyuz-vanguard-emulator">Soyuz</a>. The <a href="/#bundles">bundle deals</a> include both keys for less.`,
});

const delivery = {
  q: "How fast is delivery?",
  a: "Delivery is instant. After payment clears, your key is shown on-screen and sent to the email used at checkout.",
};

const support = {
  q: "Where do I get setup help?",
  a: 'Open a ticket in the <a href="https://discord.gg/n2ng5mJjhm" target="_blank" rel="noreferrer">LOLScript Discord</a>. Setup guidance is included with every key.',
};

const scriptSteps = (name) => [
  ["Choose your plan", `Pick the ${name} plan length, complete secure checkout with card or crypto, and receive your key instantly.`],
  ["Start your Vanguard emulator", "Run your Vanguard emulator first so League of Legends launches without Riot Vanguard active."],
  [`Load ${name}`, `Open the ${name} loader, enter your key, and start League of Legends.`],
  ["Tune and play", "Pick your champion modules, adjust evade and orbwalker settings, and queue."],
];

const emulatorSteps = (name) => [
  ["Choose your plan", `Pick the ${name} plan length, complete secure checkout, and receive your key instantly.`],
  ["Remove Riot Vanguard", "Uninstall Riot Vanguard as described in the setup guide and restart your PC."],
  [`Run ${name}`, `Start the ${name} loader as administrator and enter your key.`],
  ["Launch League and load your script", "Start League of Legends, then load your LoL script on the same PC."],
];

const bundleSteps = (emulator, script) => [
  ["Buy the bundle", `One checkout delivers both the ${emulator} key and the ${script} key instantly.`],
  [`Run ${emulator}`, `Remove Riot Vanguard, then start the ${emulator} loader as administrator.`],
  [`Load ${script}`, `Open the ${script} loader, enter the second key, and start League of Legends.`],
  ["Play", "Both keys run on the same PC for the full plan length."],
];

export const PRODUCTS = [
  // ---------------------------------------------------------------- LoL Scripts
  {
    slug: "hanbot-key",
    category: "lol-scripts",
    name: "Hanbot Key",
    price: 1.99,
    icon: "fa-solid fa-robot",
    badge: "Popular",
    card: "Hanbot League of Legends script key with orbwalker, prediction, evade, combos, and 160+ champions. Needs a Vanguard emulator.",
    title: "Buy Hanbot Key - Hanbot LoL Script from $1.99 | LOLScript",
    metaDescription: "Buy a Hanbot key for League of Legends: orbwalker, skillshot prediction, evade, combo automation, and 160+ champions. Instant delivery, 1-day and 30-day plans.",
    keywords: "hanbot, hanbot key, buy hanbot, hanbot lol, hanbot script, hanbot league of legends, hanbot price",
    eyebrow: "LoL Script",
    h1: "Hanbot Key",
    lead: "Hanbot is a League of Legends script platform that automates mechanics and adds in-game tools: orbwalker, prediction, evade, and combos for more than 160 champions. Buy a key and it is delivered instantly.",
    featuresTitle: "What Hanbot does",
    featuresText: `Hanbot handles the repetitive mechanics so you can focus on strategy and decisions, with customizable settings for every playstyle and regular updates. It runs alongside a ${EMULATORS}.`,
    features: [
      ["fa-solid fa-person-running", "Orbwalker", "Smoother movement, kiting, and last-hitting between auto attacks."],
      ["fa-solid fa-crosshairs", "Skillshot prediction", "Advanced prediction lines up skillshots on moving targets."],
      ["fa-solid fa-shield-halved", "Evade", "Dodges dangerous enemy skillshots automatically."],
      ["fa-solid fa-users", "160+ champions", "Champion modules and combo automation for most of the roster."],
      ["fa-solid fa-eye", "Tracking", "Cooldown, position, and objective tracking for dragon and baron."],
      ["fa-solid fa-wand-magic-sparkles", "Utility", "Auto ward, spell automation, auto level-up, skin changer, and zoom."],
    ],
    steps: scriptSteps("Hanbot"),
    faq: [
      { q: "What is Hanbot?", a: "Hanbot is a League of Legends script platform with orbwalker, prediction, evade, combo automation, and support for more than 160 champions." },
      needsEmulator("Hanbot"),
      { q: "Can I add US Tool or RS Pro AIO to Hanbot?", a: 'Yes. <a href="/us-tool-pro-aio">US Tool Pro AIO</a> and <a href="/rs-pro-aio">RS Pro AIO</a> are add-ons that run on top of an active Hanbot key.' },
      delivery,
      support,
    ],
    related: ["us-tool-pro-aio", "rs-pro-aio", "oxa-hanbot-bundle", "soyuz-hanbot-bundle"],
  },
  {
    slug: "legend-sense-key",
    category: "lol-scripts",
    name: "Legend Sense Key",
    price: 5.49,
    icon: "fa-solid fa-brain",
    card: "Legend Sense (LS) League of Legends script key with champion modules, evade, and prediction. Needs a Vanguard emulator.",
    title: "Buy Legend Sense Key - LS LoL Script | LOLScript",
    metaDescription: "Buy a Legend Sense (LS) key for League of Legends with champion modules, evade, prediction, and orbwalker. Instant delivery with 1-day, 7-day, and 30-day plans.",
    keywords: "legend sense, legend sense key, legendsense, ls script, buy legend sense, legend sense lol, legend sense price",
    eyebrow: "LoL Script",
    h1: "Legend Sense Key",
    lead: "Legend Sense (LS) is a League of Legends script platform with champion modules, evade, prediction, and orbwalking. Pick a plan and the key is delivered instantly.",
    featuresTitle: "What Legend Sense does",
    featuresText: `Legend Sense combines core script modules with add-on support. It runs alongside a ${EMULATORS}.`,
    features: [
      ["fa-solid fa-users", "Champion modules", "Champion scripts with combo logic for popular picks."],
      ["fa-solid fa-shield-halved", "Evade", "Configurable skillshot dodging."],
      ["fa-solid fa-crosshairs", "Prediction", "Skillshot prediction for moving targets."],
      ["fa-solid fa-person-running", "Orbwalker", "Kiting and last-hit timing between auto attacks."],
      ["fa-solid fa-puzzle-piece", "Add-on support", 'Works with <a href="/rs-pro-aio">RS Pro AIO</a> for extra combat automation.'],
      ["fa-solid fa-calendar-days", "Flexible plans", "1-day, 7-day, and 30-day keys."],
    ],
    steps: scriptSteps("Legend Sense"),
    faq: [
      { q: "What is Legend Sense?", a: "Legend Sense (LS) is a League of Legends script platform with champion modules, evade, prediction, and orbwalker." },
      needsEmulator("Legend Sense"),
      { q: "Does RS Pro AIO work with Legend Sense?", a: '<a href="/rs-pro-aio">RS Pro AIO</a> is an add-on that needs an active Legend Sense or Hanbot license.' },
      delivery,
      support,
    ],
    related: ["rs-pro-aio", "oxa-legend-sense-bundle", "soyuz-legend-sense-bundle", "hanbot-key"],
  },
  {
    slug: "enginesoul",
    category: "lol-scripts",
    name: "EngineSoul",
    price: 2.79,
    icon: "fa-solid fa-gears",
    badge: "Popular",
    card: "EngineSoul League of Legends script with short 8-hour plans up to 30 days. Needs a Vanguard emulator.",
    title: "Buy EngineSoul Key - EngineSoul LoL Script | LOLScript",
    metaDescription: "Buy an EngineSoul key for League of Legends with 8-hour, 1-day, 7-day, and 30-day plans. Instant key delivery and setup help in Discord.",
    keywords: "enginesoul, engine soul, enginesoul key, buy enginesoul, enginesoul lol, enginesoul script",
    eyebrow: "LoL Script",
    h1: "EngineSoul",
    lead: "EngineSoul is a League of Legends script with plans from 8 hours to 30 days, so you can try it for a session or run it all month. Keys are delivered instantly.",
    featuresTitle: "Why players pick EngineSoul",
    featuresText: `Short plans make EngineSoul an easy start. It runs alongside a ${EMULATORS}.`,
    features: [
      ["fa-solid fa-hourglass-half", "8-hour plan", "Try it for a single session before committing."],
      ["fa-solid fa-users", "Champion scripts", "Champion modules with combo logic."],
      ["fa-solid fa-shield-halved", "Evade", "Skillshot dodging you can tune per champion."],
      ["fa-solid fa-person-running", "Orbwalker", "Kiting and last-hit timing."],
      ["fa-solid fa-calendar-days", "Up to 30 days", "8-hour, 1-day, 7-day, and 30-day keys."],
      ["fa-solid fa-bolt-lightning", "Instant delivery", "Your key is on-screen and in your inbox right after checkout."],
    ],
    steps: scriptSteps("EngineSoul"),
    faq: [
      { q: "What is EngineSoul?", a: "EngineSoul is a League of Legends script sold in 8-hour, 1-day, 7-day, and 30-day plans." },
      needsEmulator("EngineSoul"),
      delivery,
      support,
    ],
    related: ["oxa-enginesoul-bundle", "soyuz-enginesoul-bundle", "oxa-vanguard-emulator", "soyuz-vanguard-emulator"],
  },
  {
    slug: "us-tool-pro-aio",
    category: "lol-scripts",
    name: "US Tool Pro AIO",
    price: 1.99,
    icon: "fa-solid fa-toolbox",
    card: "Advanced Hanbot add-on: tuned evade and orbwalker profiles, smart activator, auto level-up, and lobby automation. Requires Hanbot.",
    title: "US Tool Pro AIO - Hanbot Add-on | LOLScript",
    metaDescription: "US Tool Pro AIO is an advanced Hanbot add-on with tuned evade and orbwalker profiles, smart activator, auto level-up, lobby and champion select automation. Instant delivery.",
    keywords: "us tool, us tool pro aio, ustool, hanbot addon, hanbot plugin, hanbot aio",
    eyebrow: "Hanbot add-on",
    h1: "US Tool Pro AIO",
    lead: "US Tool is a powerful Hanbot add-on for League of Legends that bundles combat, automation, and quality-of-life features into one plug-in, so you spend less time configuring before every game.",
    featuresTitle: "What US Tool adds to Hanbot",
    featuresText: 'US Tool requires an active <a href="/hanbot-key">Hanbot key</a>. The Vanguard emulator is sold separately.',
    features: [
      ["fa-solid fa-shield-halved", "Evade and orbwalker profiles", "Carefully tuned profiles that work out of the box."],
      ["fa-solid fa-bolt", "Smart activator", "Smarter item and summoner spell usage."],
      ["fa-solid fa-arrow-up-wide-short", "Auto level-up", "Skill order handled automatically."],
      ["fa-solid fa-door-open", "Lobby automation", "Auto lobby, match accept, and champion select automation."],
      ["fa-solid fa-palette", "Skin changer and zoom", "Skin changer and zoom add-on included."],
      ["fa-solid fa-video", "Ward tracker and OBS tools", "Ward tracking and OBS-related features."],
    ],
    steps: [
      ["Get Hanbot", 'US Tool runs on top of an active <a href="/hanbot-key">Hanbot key</a>.'],
      ["Buy US Tool", "Complete checkout and receive your US Tool key instantly."],
      ["Start your Vanguard emulator", "Run your Vanguard emulator, then load Hanbot."],
      ["Enable US Tool", "Add the US Tool key in Hanbot and pick your profiles."],
    ],
    faq: [
      { q: "Does US Tool work without Hanbot?", a: 'No. US Tool is a Hanbot add-on and needs an active <a href="/hanbot-key">Hanbot key</a>.' },
      { q: "Is the Vanguard emulator included?", a: `No. The ${EMULATORS} is sold separately.` },
      delivery,
      support,
    ],
    related: ["hanbot-key", "rs-pro-aio", "oxa-hanbot-bundle", "soyuz-hanbot-bundle"],
  },
  {
    slug: "rs-pro-aio",
    category: "lol-scripts",
    name: "RS Pro AIO",
    price: 1.99,
    icon: "fa-solid fa-puzzle-piece",
    card: "Advanced add-on for Legend Sense and Hanbot with champion combos, optimized combat logic, Yuumi automation, and tuned evade.",
    title: "RS Pro AIO - Legend Sense and Hanbot Add-on | LOLScript",
    metaDescription: "RS Pro AIO is an advanced League of Legends add-on for Legend Sense (LS) and Hanbot: champion combos, combat logic, Yuumi automation, and tuned evade profiles. Instant delivery.",
    keywords: "rs pro aio, rs pro, rs aio, legend sense addon, hanbot addon, ls aio",
    eyebrow: "LS and Hanbot add-on",
    h1: "RS Pro AIO",
    lead: "RS Pro AIO is an advanced add-on built for Legend Sense (LS) and Hanbot. It upgrades your current script with smarter combat features and automation, with pre-configured profiles that cut down manual setup.",
    featuresTitle: "What RS Pro AIO adds",
    featuresText: 'RS Pro AIO requires an active <a href="/legend-sense-key">Legend Sense</a> or <a href="/hanbot-key">Hanbot</a> license.',
    features: [
      ["fa-solid fa-hand-fist", "Champion combos", "Improved combo sequences for supported champions."],
      ["fa-solid fa-chess", "Combat logic", "Optimized target and fight logic."],
      ["fa-solid fa-cat", "Yuumi automation", "Dedicated Yuumi automation."],
      ["fa-solid fa-shield-halved", "Tuned evade", "Adjusted evade profiles."],
      ["fa-solid fa-sliders", "Pre-configured", "Optimized profiles reduce manual configuration."],
      ["fa-solid fa-plug", "Fits your setup", "Designed to work with your existing LS or Hanbot install."],
    ],
    steps: [
      ["Have LS or Hanbot", 'RS Pro AIO runs on top of an active <a href="/legend-sense-key">Legend Sense</a> or <a href="/hanbot-key">Hanbot</a> key.'],
      ["Buy RS Pro AIO", "Complete checkout and receive your key instantly."],
      ["Start your Vanguard emulator", "Run your Vanguard emulator, then load your script."],
      ["Enable RS Pro AIO", "Add the key in your script and load the profiles."],
    ],
    faq: [
      { q: "Which scripts does RS Pro AIO work with?", a: 'RS Pro AIO needs an active <a href="/legend-sense-key">Legend Sense</a> or <a href="/hanbot-key">Hanbot</a> license.' },
      { q: "Is the Vanguard emulator included?", a: `No. The ${EMULATORS} is sold separately.` },
      delivery,
      support,
    ],
    related: ["legend-sense-key", "hanbot-key", "us-tool-pro-aio", "oxa-legend-sense-bundle"],
  },
  {
    slug: "pvlol-script",
    category: "lol-scripts",
    name: "Pvlol Script",
    price: 1.09,
    icon: "fa-solid fa-terminal",
    badge: "Budget",
    card: "Budget League of Legends script with 7-hour, 12-hour, 1-day, 7-day, and 30-day plans. Use at your own risk.",
    title: "Pvlol Script - Cheap LoL Script from $1.09 | LOLScript",
    metaDescription: "Buy Pvlol Script, a budget League of Legends script with 7-hour, 12-hour, 1-day, 7-day, and 30-day plans. Instant key delivery.",
    keywords: "pvlol, pvlolscript, pvlol script, cheap lol script, lol script 1 day",
    eyebrow: "LoL Script",
    h1: "Pvlol Script",
    lead: "Pvlol Script is the cheapest way to try a League of Legends script, with plans from a few hours up to a month. Keys are delivered instantly.",
    featuresTitle: "Pvlol plans",
    featuresText: "Short plans for a single session, longer ones if you keep it.",
    features: [
      ["fa-solid fa-hourglass-start", "7-hour key", "The shortest plan for a quick session."],
      ["fa-solid fa-hourglass-half", "12-hour key", "Half a day of play."],
      ["fa-solid fa-calendar-day", "1-day key", "A full day."],
      ["fa-solid fa-calendar-week", "7 and 30 days", "Weekly and monthly keys for regular play."],
      ["fa-solid fa-bolt-lightning", "Instant delivery", "On-screen and by email right after checkout."],
      ["fa-solid fa-headset", "Discord support", "Setup help through LOLScript Discord tickets."],
    ],
    notes: [
      "The shortest Pvlol key runs for 7 hours. Some stores list it as an 8-hour key; the length is 7 hours.",
      "Pvlol is sold as use-at-your-own-risk software.",
    ],
    steps: [
      ["Choose your plan", "Pick the plan length and complete secure checkout."],
      ["Get your key", "Your key is shown on-screen and sent to your email instantly."],
      ["Load Pvlol", "Follow the setup notes from the Discord ticket and enter your key."],
      ["Play", "Start League of Legends and configure your champion."],
    ],
    faq: [
      { q: "How long is the shortest Pvlol key?", a: "7 hours. It is sometimes listed as an 8-hour key elsewhere, but the key runs for 7 hours." },
      delivery,
      support,
    ],
    related: ["enginesoul", "hanbot-key", "lol-script", "bgx-script"],
  },
  {
    slug: "bgx-script",
    category: "lol-scripts",
    name: "BGX Script",
    price: 4.69,
    icon: "fa-solid fa-code",
    badge: "New",
    card: "BGX Script for League of Legends, delivered instantly. Needs a Vanguard emulator.",
    title: "BGX Script - BGX LoL Script Key | LOLScript",
    metaDescription: "Buy a BGX Script key for League of Legends. Instant key delivery after secure checkout and setup help in the LOLScript Discord.",
    keywords: "bgx, bgx script, bgx lol, bgx lol script, buy bgx script",
    eyebrow: "LoL Script",
    h1: "BGX Script",
    lead: "BGX Script is a League of Legends script that runs alongside a Vanguard emulator. Buy a key and it is delivered instantly, with setup help in Discord.",
    featuresTitle: "Why buy BGX from LOLScript",
    featuresText: `BGX runs alongside a ${EMULATORS}.`,
    features: [
      ["fa-solid fa-bolt-lightning", "Instant delivery", "Your key is on-screen and in your inbox right after checkout."],
      ["fa-solid fa-lock", "Secure checkout", "Card and crypto payments."],
      ["fa-solid fa-headset", "Setup help", "Step-by-step help through LOLScript Discord tickets."],
      ["fa-solid fa-shield-halved", "Pairs with emulators", "Works with the Vanguard emulators sold on LOLScript."],
    ],
    steps: scriptSteps("BGX Script"),
    faq: [
      { q: "What is BGX Script?", a: "BGX Script is a League of Legends script sold as a time-based key." },
      needsEmulator("BGX Script"),
      delivery,
      support,
    ],
    related: ["oxa-vanguard-emulator", "soyuz-vanguard-emulator", "enginesoul", "hanbot-key"],
  },

  // ---------------------------------------------------------------- Vanguard emulators
  {
    slug: "noi-vanguard-emulator",
    category: "vanguard-bypass",
    name: "NOI Vanguard Emulator",
    price: 3.89,
    icon: "fa-solid fa-microchip",
    badge: "Tested",
    card: "NOI 1-PC Vanguard emulator: remove Vanguard, run as administrator, and play. Easy setup, fast access.",
    title: "NOI Vanguard Emulator - 1-PC LoL Vanguard Bypass | LOLScript",
    metaDescription: "NOI is a 1-PC Vanguard emulator for League of Legends: remove Riot Vanguard, run NOI as administrator, and play with your script. Instant 1-day and 7-day keys.",
    keywords: "noi bypass, noi vanguard, noi emulator, no1 bypass, lol vanguard bypass, vanguard emulator 1pc",
    eyebrow: "Vanguard emulator",
    h1: "NOI Vanguard Emulator",
    lead: "NOI is a Vanguard emulator that works with the 1-PC method: remove Riot Vanguard, run NOI as administrator, and play League of Legends with your script on the same computer.",
    featuresTitle: "How NOI works",
    featuresText: "Easy setup and fast access on a single PC.",
    features: [
      ["fa-solid fa-desktop", "1-PC method", "Runs on the same PC as League and your script."],
      ["fa-solid fa-user-shield", "Run as administrator", "Start the NOI loader as administrator and you are ready."],
      ["fa-solid fa-gauge-high", "Easy setup", "No second PC or extra hardware."],
      ["fa-solid fa-flask", "Tested", "Tested before it is listed."],
    ],
    steps: emulatorSteps("NOI"),
    faq: [
      { q: "What is a Vanguard emulator?", a: "A Vanguard emulator lets League of Legends start while Riot Vanguard is removed, so your LoL script can load. It is often called a Vanguard bypass." },
      { q: "Do I need a second PC for NOI?", a: "No. NOI uses the 1-PC method and runs on the same computer as League of Legends." },
      delivery,
      support,
    ],
    related: ["hanbot-key", "legend-sense-key", "enginesoul", "oxa-vanguard-emulator"],
  },
  {
    slug: "seraph-vanguard-emulator",
    category: "vanguard-bypass",
    name: "Seraph Vanguard Emulator",
    price: 4.69,
    icon: "fa-brands fa-linux",
    badge: "New",
    card: "Seraph 1-PC Vanguard emulator: launch League of Legends without Vanguard. Also works on Linux.",
    title: "Seraph Vanguard Emulator - 1-PC Bypass, Works on Linux | LOLScript",
    metaDescription: "Seraph is a 1-PC Vanguard emulator for League of Legends that starts the game without Riot Vanguard and also works on Linux. Instant 1-day and 7-day keys.",
    keywords: "seraph bypass, seraph vanguard, seraph emulator, lol vanguard bypass linux, vanguard emulator 1pc",
    eyebrow: "Vanguard emulator",
    h1: "Seraph Vanguard Emulator",
    lead: "Seraph is a 1-PC Vanguard emulator that starts League of Legends without Riot Vanguard. It also runs on Linux.",
    featuresTitle: "What Seraph offers",
    featuresText: "Launch League without Vanguard on one PC, with any script you already use.",
    features: [
      ["fa-solid fa-play", "Play without Vanguard", "Start the game without Riot Vanguard running."],
      ["fa-brands fa-linux", "Works on Linux", "Runs on Linux as well as Windows."],
      ["fa-solid fa-eye-slash", "Blocks Riot telemetry", "Blocks Riot telemetry and tracking while you play."],
      ["fa-solid fa-plug", "Works with every script", "Compatible with Hanbot, Legend Sense, EngineSoul, and other scripts."],
      ["fa-solid fa-desktop", "1-PC", "No second computer needed."],
      ["fa-solid fa-flask", "Tested", "Tested before it is listed."],
    ],
    steps: emulatorSteps("Seraph"),
    faq: [
      { q: "Does Seraph work on Linux?", a: "Yes. Seraph works on Linux." },
      { q: "Which scripts work with Seraph?", a: 'Seraph is compatible with all scripts, including <a href="/hanbot-key">Hanbot</a>, <a href="/legend-sense-key">Legend Sense</a>, and <a href="/enginesoul">EngineSoul</a>.' },
      { q: "Is there a private Seraph version?", a: 'Yes. A private Seraph build is available for $250 per month. Open a ticket in the <a href="/discord" target="_blank" rel="noreferrer">LOLScript Discord</a> to ask about it.' },
      { q: "Do I need a second PC?", a: "No. Seraph is a 1-PC Vanguard emulator." },
      delivery,
      support,
    ],
    related: ["hanbot-key", "legend-sense-key", "enginesoul", "noi-vanguard-emulator"],
  },
  {
    slug: "oxa-vanguard-emulator",
    category: "vanguard-bypass",
    name: "OXA Vanguard Emulator",
    price: 4.69,
    icon: "fa-solid fa-server",
    badge: "Popular",
    card: "OXA 1-PC Vanguard emulator with a slot system and 1-day or 7-day keys. Check slot availability before buying.",
    title: "OXA Vanguard Emulator - OXA 1PC LoL Bypass | LOLScript",
    metaDescription: "OXA is a 1-PC Vanguard emulator for League of Legends with a slot system and 1-day or 7-day keys. Instant delivery; check slot availability in Discord first.",
    keywords: "oxa, oxa 1pc, oxa bypass, oxa vanguard, oxa emulator, lol vanguard bypass, vanguard emulator 1pc",
    eyebrow: "Vanguard emulator",
    h1: "OXA Vanguard Emulator",
    lead: "OXA is a 1-PC Vanguard emulator for League of Legends. Each key is linked to a slot, and support can move you to a fresh slot when needed.",
    featuresTitle: "How OXA works",
    featuresText: "A slot-based Vanguard emulator on a single PC.",
    features: [
      ["fa-solid fa-desktop", "1-PC", "Runs on the same PC as League and your script."],
      ["fa-solid fa-arrows-rotate", "Slot changes", "If you get banned repeatedly in a short time, support resets your key to a new slot."],
      ["fa-solid fa-calendar-days", "1-day and 7-day keys", "Short and weekly plans."],
      ["fa-solid fa-flask", "Tested", "Tested before it is listed."],
    ],
    notes: [
      "Contact us before buying. When every slot is full, new keys cannot be activated, so open a Discord ticket to confirm a free slot first.",
      "Moving your key to another machine deducts 3 hours from the remaining time.",
      "After a slot change, wait 30 to 60 seconds, reopen OXA, and log in; it connects to your new slot automatically.",
      "No specific ban duration, account safety, or ban-free use is guaranteed. Buy only if you understand how the product works and its risks.",
    ],
    steps: emulatorSteps("OXA"),
    faq: [
      { q: "Why should I check slots before buying OXA?", a: "OXA keys run on slots. When all slots are full, new keys cannot be activated until one opens, so confirm availability in a Discord ticket first." },
      { q: "What happens if I switch PCs?", a: "Moving to another machine deducts 3 hours from your remaining subscription time." },
      { q: "What if I keep getting banned?", a: "Send your key to support. The team can reset it and assign you a new slot." },
      delivery,
    ],
    related: ["oxa-hanbot-bundle", "oxa-enginesoul-bundle", "oxa-legend-sense-bundle", "soyuz-vanguard-emulator"],
  },
  {
    slug: "soyuz-vanguard-emulator",
    category: "vanguard-bypass",
    name: "Soyuz Vanguard Emulator",
    price: 4.69,
    icon: "fa-solid fa-rocket",
    badge: "Popular",
    card: "Soyuz 1-PC Vanguard emulator with 1-day and 7-day keys. Public build: occasional Vanguard event or 2266 errors.",
    title: "Soyuz Vanguard Emulator - Soyuz 1PC LoL Bypass | LOLScript",
    metaDescription: "Soyuz is a 1-PC Vanguard emulator for League of Legends with 1-day and 7-day keys. Instant delivery and setup help in Discord.",
    keywords: "soyuz, soyuz 1pc, soyuz bypass, soyuz vanguard, soyuz emulator, lol vanguard bypass, vanguard emulator 1pc",
    eyebrow: "Vanguard emulator",
    h1: "Soyuz Vanguard Emulator",
    lead: "Soyuz is a 1-PC Vanguard emulator for League of Legends with 1-day and 7-day keys. Run it on the same PC as your script.",
    featuresTitle: "What Soyuz offers",
    featuresText: "A simple 1-PC Vanguard emulator with short plans.",
    features: [
      ["fa-solid fa-desktop", "1-PC", "No second computer needed."],
      ["fa-solid fa-calendar-days", "1-day and 7-day keys", "Short and weekly plans."],
      ["fa-solid fa-layer-group", "Bundle ready", "Available in bundles with Hanbot, EngineSoul, and Legend Sense."],
      ["fa-solid fa-flask", "Tested", "Tested before it is listed."],
    ],
    notes: [
      "Soyuz is public software, so you may occasionally see a Vanguard event error or error 2266. Please keep this in mind before buying.",
    ],
    steps: emulatorSteps("Soyuz"),
    faq: [
      { q: "Why do I sometimes get error 2266 with Soyuz?", a: "Soyuz is a public build, so Vanguard event errors such as 2266 can happen from time to time. Open a Discord ticket if it keeps happening." },
      { q: "Do I need a second PC?", a: "No. Soyuz is a 1-PC Vanguard emulator." },
      delivery,
      support,
    ],
    related: ["soyuz-hanbot-bundle", "soyuz-enginesoul-bundle", "soyuz-legend-sense-bundle", "oxa-vanguard-emulator"],
  },
];

// ---------------------------------------------------------------- Bundles
const BUNDLE_PARTS = {
  oxa: { name: "OXA", slug: "oxa-vanguard-emulator" },
  soyuz: { name: "Soyuz", slug: "soyuz-vanguard-emulator" },
  enginesoul: { name: "EngineSoul", slug: "enginesoul" },
  hanbot: { name: "Hanbot", slug: "hanbot-key" },
  "legend-sense": { name: "Legend Sense", slug: "legend-sense-key" },
};

const bundle = (emu, script, price, save, weekly = false) => {
  const e = BUNDLE_PARTS[emu];
  const s = BUNDLE_PARTS[script];
  const length = weekly ? "1-day or 7-day" : "1-day";
  const slug = `${emu}-${script}-bundle`;
  const name = `${e.name} + ${s.name} Bundle`;
  return {
    slug,
    category: "bundles",
    name,
    price,
    icon: "fa-solid fa-layer-group",
    badge: `Bundle -${save}%`,
    card: `${e.name} Vanguard emulator and ${s.name} in one checkout: both ${length} keys for ${save}% less than buying them separately.`,
    title: `${e.name} + ${s.name} Bundle - LoL Script and Vanguard Emulator | LOLScript`,
    metaDescription: `Buy the ${e.name} Vanguard emulator and ${s.name} together and save ${save}%. Both keys are delivered instantly in one checkout.`,
    keywords: `${e.name.toLowerCase()} ${s.name.toLowerCase()}, ${e.name.toLowerCase()} + ${s.name.toLowerCase()}, ${s.name.toLowerCase()} bundle, lol script bundle, lol script with bypass`,
    eyebrow: "Bundle deal",
    h1: `${e.name} + ${s.name}`,
    lead: `Everything you need to play in one checkout: the <a href="/${e.slug}">${e.name} Vanguard emulator</a> and <a href="/${s.slug}">${s.name}</a>, ${save}% cheaper than buying both keys separately.`,
    featuresTitle: "What is in the bundle",
    featuresText: "Two keys, one checkout, instant delivery.",
    features: [
      ["fa-solid fa-shield-halved", `${e.name} Vanguard emulator`, `A ${length} <a href="/${e.slug}">${e.name}</a> key so League starts without Riot Vanguard.`],
      ["fa-solid fa-code", s.name, `A ${length} <a href="/${s.slug}">${s.name}</a> key for the script itself.`],
      ["fa-solid fa-tags", `Save ${save}%`, "Cheaper than buying the two keys one by one."],
      ["fa-solid fa-bolt-lightning", "Instant delivery", "Both keys are shown on-screen and emailed right after checkout."],
    ],
    steps: bundleSteps(e.name, s.name),
    faq: [
      { q: "What do I get in this bundle?", a: `A ${e.name} Vanguard emulator key and a ${s.name} key, delivered together.` },
      { q: "Can I buy a longer plan?", a: weekly
        ? "Yes. Pick the 7-day bundle in the plan picker; both keys are delivered for the duration you select."
        : "Longer bundle plans appear in the plan picker when they are in stock." },
      delivery,
      support,
    ],
    related: [e.slug, s.slug],
    parts: [e.slug, s.slug],
  };
};

PRODUCTS.push(
  bundle("oxa", "enginesoul", 8.89, 5, true),
  bundle("soyuz", "enginesoul", 8.89, 5, true),
  bundle("oxa", "hanbot", 6.29, 5),
  bundle("soyuz", "hanbot", 6.29, 5),
  bundle("oxa", "legend-sense", 9.79, 3, true),
  bundle("soyuz", "legend-sense", 9.79, 3, true)
);

const OXA_BUNDLE_NOTE = "OXA keys run on slots. Open a Discord ticket to confirm a free slot before buying.";
const SOYUZ_BUNDLE_NOTE = "Soyuz is public software, so an occasional Vanguard event or 2266 error can happen.";
for (const p of PRODUCTS) {
  if (p.category !== "bundles") continue;
  p.notes = [p.slug.startsWith("oxa-") ? OXA_BUNDLE_NOTE : SOYUZ_BUNDLE_NOTE];
}

export const CATEGORY_LABELS = {
  "lol-scripts": "LoL Scripts",
  "vanguard-bypass": "Vanguard Emulators",
  bundles: "Bundle Deals",
  spoofers: "HWID Spoofers",
};
