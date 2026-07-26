/* ===================================================================
   15minYoga — custom line pictograms
   Hand-drawn 24×24 line icons in the brand style (1.5 stroke, round caps).
   Deliberately NOT emoji: each icon carries the meaning of its own line.
   =================================================================== */
window.NIGUMA_ICONS = {
  /* 1 — waiting for someone to change your life: a magic wand */
  wand: '<path d="M4 20 13.5 10.5"/><path d="M17 3.5 17.9 6.1 20.5 7 17.9 7.9 17 10.5 16.1 7.9 13.5 7 16.1 6.1Z"/>',

  /* 2 — not ready to invest 15 minutes: a clock */
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 6.8V12l3.4 2.2"/>',

  /* 3 — same habits, different results: a closed loop */
  loop: '<path d="M19.2 12a7.2 7.2 0 1 1-2.1-5.1"/><path d="M20.6 4.2v4.1h-4.1"/>',

  /* 4 — motivation instead of a system: a flame */
  flame: '<path d="M12 3.2c2.6 2.8 4.4 5.4 4.4 8.1a4.4 4.4 0 0 1-8.8 0c0-1.6.8-3 1.9-4.2.5.8 1.1 1.4 1.8 1.7-.1-2 .2-3.9.7-5.6Z"/>',

  /* 5 — "my state doesn't affect my decisions": a head in profile */
  head: '<path d="M19.5 12.6A7.5 7.5 0 1 0 9.5 19.6V21h5.2v-2.6a3 3 0 0 1 1.1-2.3 7.4 7.4 0 0 0 1.6-1.8"/><path d="M19.5 12.6h1.6l-1.7-3"/>',

  /* 6 — only fitness: a dumbbell */
  dumbbell: '<path d="M6.8 7.6v8.8M17.2 7.6v8.8M3.8 10v4M20.2 10v4M6.8 12h10.4"/>',

  /* 7 — obsessed with the perfect asana shape: a ruler */
  ruler: '<path d="M3.2 16.8 16.8 3.2l4 4L7.2 20.8Z"/><path d="M7.6 12.4l1.8 1.8M10.6 9.4l1.8 1.8M13.6 6.4l1.8 1.8"/>',

  /* 8 — wanting to control everything: a padlock */
  lock: '<rect x="4.6" y="10.6" width="14.8" height="9.6" rx="2"/><path d="M7.8 10.6V7.9a4.2 4.2 0 0 1 8.4 0v2.7"/>',

  /* 9 — expecting instant results: a lightning bolt */
  bolt: '<path d="M13.2 2.4 4.6 13.9h6.4l-1.2 7.7 8.6-11.5h-6.4Z"/>',

  /* 10 — not ready to observe yourself honestly: an eye */
  eye: '<path d="M2.2 12S5.9 6.2 12 6.2 21.8 12 21.8 12 18.1 17.8 12 17.8 2.2 12 2.2 12Z"/><circle cx="12" cy="12" r="2.9"/>',

  /* 11 — blaming external circumstances: a rain cloud */
  cloud: '<path d="M17.2 16.8a4.2 4.2 0 0 0 .2-8.4 6 6 0 0 0-11.4 1.5 3.5 3.5 0 0 0 .6 6.9h10.6Z"/><path d="M8.6 19.4v1.8M12 19.4v2.4M15.4 19.4v1.8"/>'
};

/* order used by the "not for you" block — one icon per statement */
window.NIGUMA_NOTFOR_ICONS = [
  "wand", "clock", "loop", "flame", "head", "dumbbell",
  "ruler", "lock", "bolt", "eye", "cloud"
];
