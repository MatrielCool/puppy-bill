import { puppyStandalone } from '../src/ui/puppyArtwork.mjs';

/** Same portrait as the in-app avatar, on an opaque background for iOS. */
export function puppySvg(scale = 1) {
  return puppyStandalone({ detailed: true, background: '#e8c575', scale: scale * .94 });
}
