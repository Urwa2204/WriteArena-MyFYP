/* ============================================================
   WriteArena — Avatar store
   Lets a user browse a file from their device and use it as their
   display picture WITHOUT any backend change.

   How it works:
   - The chosen image is drawn to a canvas, center-cropped to a
     square and downscaled (default 256px), then exported as a
     compressed JPEG data URL.
   - That data URL is saved in localStorage keyed by user id, so it
     persists across sessions on this device and shows immediately
     everywhere through the shared <Avatar> component.

   Why local-only:
   - The backend `avatar_url` column is String(500) and there is no
     file-upload route, so a base64 image cannot be stored server-side
     without a backend change. Keeping it local honours the
     "no backend changes" constraint while still giving a real
     browse-and-upload experience.

   To make avatars persist across devices and be visible to other
   users, enable the optional upload route documented in the README;
   then this module can be pointed at it instead.
   ============================================================ */

const KEY = (userId) => `wa_avatar_${userId ?? "me"}`;

/** Read a locally uploaded avatar data URL for a user, or null. */
export function getLocalAvatar(userId) {
  try {
    return localStorage.getItem(KEY(userId)) || null;
  } catch {
    return null;
  }
}

/** Persist a locally uploaded avatar data URL for a user. */
export function setLocalAvatar(userId, dataUrl) {
  try {
    localStorage.setItem(KEY(userId), dataUrl);
    // let any mounted <Avatar> know to refresh
    window.dispatchEvent(new CustomEvent("wa-avatar-changed", { detail: { userId } }));
  } catch {
    /* storage may be full / blocked — ignore */
  }
}

/** Remove a locally uploaded avatar for a user. */
export function clearLocalAvatar(userId) {
  try {
    localStorage.removeItem(KEY(userId));
    window.dispatchEvent(new CustomEvent("wa-avatar-changed", { detail: { userId } }));
  } catch {
    /* ignore */
  }
}

/**
 * Turn a browsed File into a compressed square JPEG data URL.
 * @param {File} file
 * @param {number} size  output edge length in px
 * @param {number} quality  JPEG quality 0..1
 * @returns {Promise<string>} data URL
 */
export function fileToAvatarDataUrl(file, size = 256, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That image could not be loaded."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        // center-crop to square
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Convenience: browse → compress → store locally for a user.
 * @returns {Promise<string>} the stored data URL
 */
export async function uploadAvatarLocally(userId, file, opts = {}) {
  const dataUrl = await fileToAvatarDataUrl(file, opts.size, opts.quality);
  setLocalAvatar(userId, dataUrl);
  return dataUrl;
}
