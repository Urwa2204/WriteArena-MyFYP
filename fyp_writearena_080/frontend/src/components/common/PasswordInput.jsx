import React, { useState } from "react";

/* ============================================================
   WriteArena — Password field
   A drop-in replacement for <input type="password"> that adds:
     • a show/hide "eye" toggle so people can verify what they typed
     • proper name + autoComplete attributes so browsers and password
       managers offer to save / autofill the credential
   Pass `autoComplete="new-password"` on sign-up / reset screens and
   "current-password" on the sign-in screen.
   ============================================================ */
const EyeOpen = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOff = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7c1.6 0 3 .4 4.3 1M22 12s-3.5 7-10 7c-1.6 0-3-.4-4.3-1" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="M3 3l18 18" />
  </svg>
);

export default function PasswordInput({
  value,
  onChange,
  placeholder = "Your password",
  name = "password",
  id,
  autoComplete = "current-password",
  required = false,
  style = {},
  inputStyle = {},
  autoFocus = false,
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", ...style }}>
      <input
        className="input"
        type={show ? "text" : "password"}
        name={name}
        id={id || name}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        style={{ paddingRight: 44, ...inputStyle }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        title={show ? "Hide password" : "Show password"}
        tabIndex={-1}
        style={{
          position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
          width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--ink2)", cursor: "pointer", background: "transparent", border: "none",
          borderRadius: 8,
        }}
      >
        {show ? <EyeOff /> : <EyeOpen />}
      </button>
    </div>
  );
}
