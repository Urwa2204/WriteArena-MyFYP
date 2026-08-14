import React, { useEffect, useState } from "react";
import { getLocalAvatar } from "../../lib/avatarStore";

/* ============================================================
   WriteArena — Avatar
   Single source of truth for showing a user's display picture.
   Resolution order:
     1. locally uploaded image (localStorage, this device)
     2. user.avatar_url (URL set via profile)
     3. serif initial on a soft lavender disc
   Re-renders when an upload happens elsewhere (wa-avatar-changed).
   ============================================================ */

export default function Avatar({ user, size = 40, fontSize, style, className = "" }) {
  const userId = user?.user_id;
  const [local, setLocal] = useState(() => getLocalAvatar(userId));

  useEffect(() => {
    setLocal(getLocalAvatar(userId));
    const onChange = (e) => {
      if (!e.detail || e.detail.userId === userId) setLocal(getLocalAvatar(userId));
    };
    window.addEventListener("wa-avatar-changed", onChange);
    return () => window.removeEventListener("wa-avatar-changed", onChange);
  }, [userId]);

  const src = local || user?.avatar_url;
  const initial = (user?.display_name || user?.username || "?").charAt(0).toUpperCase();

  return (
    <div
      className={"avatar " + className}
      style={{
        width: size,
        height: size,
        fontSize: fontSize || Math.round(size * 0.42),
        ...style,
      }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
        />
      ) : (
        initial
      )}
    </div>
  );
}
