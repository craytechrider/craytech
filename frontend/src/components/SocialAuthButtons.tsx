import React from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

// OAuth routes are in Laravel web.php, outside the /api prefix.
const OAUTH_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

const SocialAuthButtons: React.FC = () => {
  const startSocialLogin = (provider: "google" | "facebook") => {
    window.location.assign(`${OAUTH_BASE_URL}/auth/${provider}/redirect`);
  };

  return (
    <div className="social-auth">
      <div className="social-divider">
        <span />
        <p>OR CONTINUE WITH</p>
        <span />
      </div>

      <button
        type="button"
        className="social-button google-button"
        onClick={() => startSocialLogin("google")}
      >
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.9c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.37 37.98 46.98 31.86 46.98 24.55z"
          />
          <path
            fill="#FBBC05"
            d="M10.54 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.98-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.44-4.89 2.3-8.17 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
        <span>Continue with Google</span>
      </button>

      <button
        type="button"
        className="social-button facebook-button"
        onClick={() => startSocialLogin("facebook")}
      >
        <span className="facebook-mark">f</span>
        <span>Continue with Facebook</span>
      </button>

      <style>{`
        .social-auth {
          width: 100%;
          margin-top: 17px;
        }

        .social-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 15px 0;
        }

        .social-divider span {
          flex: 1;
          height: 1px;
          background: #dbe2ea;
        }

        .social-divider p {
          margin: 0;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          white-space: nowrap;
        }

        .social-button {
          width: 100%;
          min-height: 43px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 11px;
          margin-top: 9px;
          padding: 9px 14px;
          border: 1px solid #d8dee8;
          border-radius: 10px;
          background: #fff;
          color: #263244;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: .2s ease;
        }

        .social-button:hover {
          background: #f8fafc;
          border-color: #aebaca;
          transform: translateY(-1px);
        }

        .social-button svg {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        .facebook-mark {
          width: 19px;
          height: 19px;
          display: inline-flex;
          align-items: flex-end;
          justify-content: center;
          border-radius: 50%;
          background: #1877f2;
          color: white;
          font-family: Arial, sans-serif;
          font-size: 19px;
          font-weight: 700;
          line-height: 18px;
        }
      `}</style>
    </div>
  );
};

export default SocialAuthButtons;
