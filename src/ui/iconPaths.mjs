import { PUPPY_ICON } from './puppyArtwork.mjs';

/** Original soft-journal icons. 24px grid, 1.6px rounded strokes; palette lives in tokens.css. */
export const ICON_PATHS = {
  "food": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 11h18c-.6 6-3.7 8-9 8s-8.4-2-9-8Z\" class=\"ic-butter\"/><path d=\"M7 21h10M8 7c-2-2 2-3 0-5M13 7c-2-2 2-3 0-5M18 7c-2-2 2-3 0-5\" fill=\"none\"/></g>",
  "coffee": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 7h11v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z\" class=\"ic-peach\"/><path d=\"M16 8h2a3 3 0 0 1 0 6h-2M3 22h16M9 3v1M13 2v2\" fill=\"none\"/></g>",
  "transit": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"5\" y=\"3\" width=\"14\" height=\"16\" rx=\"4\" class=\"ic-mint\"/><path d=\"M5 11h14M9 6h6M7 19v2M17 19v2\" fill=\"none\"/><circle cx=\"8.5\" cy=\"15\" r=\".8\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"15.5\" cy=\"15\" r=\".8\" fill=\"currentColor\" stroke=\"none\"/></g>",
  "shopping": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 8h14l1 12H4L5 8Z\" class=\"ic-lavender\"/><path d=\"M8.5 9V6a3.5 3.5 0 0 1 7 0v3M9 14c1.8 1.5 4.2 1.5 6 0\" fill=\"none\"/></g>",
  "home": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m4 10 8-7 8 7v10H4V10Z\" class=\"ic-peach\"/><path d=\"m2 11 10-9 10 9M10 20v-6h4v6\" fill=\"none\"/></g>",
  "health": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"5\" class=\"ic-mint\"/><path d=\"M8 5V3h8v2M12 9v8M8 13h8\" fill=\"none\"/></g>",
  "fun": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7 7h10c3 0 4 3 4 6v3c0 3-3 4-5 1l-1-1H9l-1 1c-2 3-5 2-5-1v-3c0-3 1-6 4-6Z\" class=\"ic-lavender\"/><path d=\"M7.5 10v5M5 12.5h5\" fill=\"none\"/><circle cx=\"16\" cy=\"11\" r=\".8\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"18\" cy=\"14\" r=\".8\" fill=\"currentColor\" stroke=\"none\"/></g>",
  "pet": "<g stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"ic-butter\"><path d=\"M6 17c0-2 1.6-3 3-5 1.5-2 4.5-2 6 0 1.4 2 3 3 3 5s-2.5 3-6 1.8C8.5 20 6 19 6 17Z\"/><ellipse cx=\"5\" cy=\"9\" rx=\"2\" ry=\"2.5\" transform=\"rotate(-24 5 9)\"/><ellipse cx=\"10\" cy=\"5\" rx=\"2\" ry=\"2.5\"/><ellipse cx=\"15\" cy=\"5.5\" rx=\"2\" ry=\"2.5\"/><ellipse cx=\"19.5\" cy=\"10\" rx=\"1.8\" ry=\"2.4\" transform=\"rotate(24 19.5 10)\"/></g>",
  "salary": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 7V5a2 2 0 0 1 2-2h11v4\" fill=\"none\"/><rect x=\"3\" y=\"7\" width=\"18\" height=\"14\" rx=\"4\" class=\"ic-mint\"/><path d=\"M21 11h-5a3 3 0 0 0 0 6h5\" fill=\"none\"/><circle cx=\"16.5\" cy=\"14\" r=\".8\" fill=\"currentColor\" stroke=\"none\"/></g>",
  "receipt": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 3h14v19l-3-2-4 2-4-2-3 2V3Z\" class=\"ic-butter\"/><path d=\"M8.5 7h7M8.5 11h7M8.5 15h4\" fill=\"none\"/></g>",
  "pending": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"4\" width=\"15\" height=\"13\" rx=\"3\" class=\"ic-peach\"/><path d=\"M7 8h7M7 12h4\" fill=\"none\"/><circle cx=\"17\" cy=\"17\" r=\"5\" class=\"ic-paper\"/><path d=\"M17 14v3l2 1\" fill=\"none\"/></g>",
  "budget": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10 3a9 9 0 1 0 11 11H10V3Z\" class=\"ic-mint\"/><path d=\"M14 2v8h8a9 9 0 0 0-8-8Z\" class=\"ic-mint\"/></g>",
  "dog": PUPPY_ICON,
  "plus": "<path d=\"M12 5v14M5 12h14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>",
  "arrow": "<path d=\"M5 12h14m-5-5 5 5-5 5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "calendar": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"><rect x=\"4\" y=\"5\" width=\"16\" height=\"16\" rx=\"4\"/><path d=\"M8 3v5M16 3v5M4 10h16M8 14h2M14 14h2\"/></g>",
  "backspace": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"><path d=\"M9 5h11v14H9l-7-7 7-7Z\"/><path d=\"m11 9 6 6M17 9l-6 6\"/></g>",
  "chevron": "<path d=\"m9 6 6 6-6 6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "record": "<path d=\"M12 5v14M5 12h14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>",
  "list": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 3h14v19l-3-2-4 2-4-2-3 2V3Z\" class=\"ic-butter\"/><path d=\"M8.5 7h7M8.5 11h7M8.5 15h4\" fill=\"none\"/></g>",
  "profile": PUPPY_ICON,
  "study": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 6C8 3 4 3 2 4v15c3-1 6-1 10 2 4-3 7-3 10-2V4c-2-1-6-1-10 2Z\" class=\"ic-lavender\"/><path d=\"M12 6v15M5 8l4 1M5 12l4 1M15 9l4-1M15 13l4-1\" fill=\"none\"/></g>",
  "social": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"4\" y=\"10\" width=\"16\" height=\"11\" rx=\"2\" class=\"ic-peach\"/><rect x=\"3\" y=\"7\" width=\"18\" height=\"4\" rx=\"1.5\" class=\"ic-peach\"/><path d=\"M12 7v14M12 7C5 7 5 2 8 2c3 0 4 5 4 5s1-5 4-5c3 0 3 5-4 5Z\" fill=\"none\"/></g>",
  "other": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 4h9l10 10-8 8L3 11V4Z\" class=\"ic-lavender\"/><circle cx=\"7.5\" cy=\"8\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/></g>",
  "bonus": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m11 2 2.8 6.2L20 11l-6.2 2.8L11 20l-2.8-6.2L2 11l6.2-2.8L11 2Z\" class=\"ic-butter\"/><path d=\"M19 17v5M16.5 19.5h5\" fill=\"none\"/></g>",
  "redpacket": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"5\" y=\"2\" width=\"14\" height=\"20\" rx=\"3\" class=\"ic-peach\"/><path d=\"m5 6 7 4 7-4\" fill=\"none\"/><circle cx=\"12\" cy=\"15\" r=\"3\" class=\"ic-butter\"/></g>",
  "chevronLeft": "<path class=\"ic-stroke\" d=\"m15 6-6 6 6 6\"/>",
  "chevronRight": "<path d=\"m9 6 6 6-6 6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "close": "<path class=\"ic-stroke\" d=\"m6 6 12 12M18 6 6 18\"/>",
  "search": "<path class=\"ic-stroke\" d=\"M16.5 16.5 21 21\"/><circle class=\"ic-stroke\" cx=\"10.5\" cy=\"10.5\" r=\"6.5\"/>",
  "filter": "<path class=\"ic-stroke\" d=\"M4 7h16M4 17h16\"/><g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"9\" cy=\"7\" r=\"2.5\" class=\"ic-paper\"/><circle cx=\"15\" cy=\"17\" r=\"2.5\" class=\"ic-paper\"/></g>",
  "export": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 10v10h14V10\" class=\"ic-mint\"/><path d=\"M12 3v11M8 7l4-4 4 4\" fill=\"none\"/></g>",
  "import": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 13v7h14v-7\" class=\"ic-lavender\"/><path d=\"M12 3v12m-4-4 4 4 4-4\" fill=\"none\"/></g>",
  "bell": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 10a6 6 0 0 1 12 0v5l2 3H4l2-3v-5Z\" class=\"ic-butter\"/><path d=\"M10 21h4M12 2v2\" fill=\"none\"/></g>",
  "replace": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"4\" class=\"ic-peach\"/><path d=\"M7 9h10l-2-2M17 15H7l2 2\" fill=\"none\"/></g>",
  "check": "<path class=\"ic-stroke\" d=\"m5 12 4 4L19 6\"/>",
  "warning": "<g stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m12 3 10 18H2L12 3Z\" class=\"ic-butter\"/><path d=\"M12 9v5M12 17v.2\" fill=\"none\"/></g>"
};

export const ICON_COLORS = {
  "ic-ink": "#414139",
  "ic-peach": "#e8d2cb",
  "ic-mint": "#ccd7c0",
  "ic-butter": "#e8c575",
  "ic-coral": "#d5a99f",
  "ic-lavender": "#dcd5e7",
  "ic-paper": "#fffefa"
};
