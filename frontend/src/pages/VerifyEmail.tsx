import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../lib/api";

interface VerifyResponse {
  success: boolean;
  message: string;
}

interface VerifyLocationState {
  email?: string;
  notice?: string;
}

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as VerifyLocationState | null;

  const [email, setEmail] = useState(state?.email || "");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(state?.notice || "");

  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [resendSeconds, setResendSeconds] = useState(0);

  // Countdown timers
  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingSeconds((previous) => Math.max(0, previous - 1));

      setResendSeconds((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(
      2,
      "0",
    )}`;
  };

  // VERIFY EMAIL
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post<VerifyResponse>("/email/verify-code", {
        email: email.trim(),
        code,
      });

      if (response.data.success) {
        setSuccess(response.data.message || "Email successfully verified!");

        // Do not save a token here.
        // Customer must log in after verification.
        window.setTimeout(() => {
          navigate("/login", {
            replace: true,
            state: {
              verified: true,
              email: email.trim(),
            },
          });
        }, 1500);
      } else {
        setError(response.data.message || "Verification failed.");
      }
    } catch (err: any) {
      const data = err.response?.data;

      setError(
        data?.message || "Unable to verify your email. Please try again.",
      );

      // If the server says the code expired, stop the timer.
      if (
        data?.message?.toLowerCase().includes("expired") ||
        data?.message?.toLowerCase().includes("no verification code")
      ) {
        setRemainingSeconds(0);
      }
    } finally {
      setLoading(false);
    }
  };

  // RESEND CODE
  const handleResend = async () => {
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setResending(true);

    try {
      const response = await api.post<VerifyResponse>("/email/resend-code", {
        email: email.trim(),
      });

      if (response.data.success) {
        setSuccess("A new verification code has been requested.");

        setCode("");
        setRemainingSeconds(300);
        setResendSeconds(60);
      } else {
        setError(response.data.message || "Unable to resend code.");
      }
    } catch (err: any) {
      const data = err.response?.data;

      setError(data?.message || "Unable to resend verification code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="verify-page">
      <div className="background-overlay" />

      <div className="blur-orb orb-one" />
      <div className="blur-orb orb-two" />
      <div className="blur-orb orb-three" />

      <main className="verify-wrapper">
        <div className="verify-card">
          {/* LOGO */}
          <div className="logo-wrapper">
            <img src="/craytech-logo.png" alt="CRAYTECH" className="logo" />
          </div>

          {/* BRAND */}
          <h1>CRAYTECH</h1>

          <div className="brand-line" />

          <h2>Email Verification</h2>

          <p className="subtitle">
            Please verify your email address to activate your CRAYTECH customer
            account.
          </p>

          {/* EMAIL */}
          <div className="email-section">
            <label htmlFor="email">Email Address</label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
              required
            />
          </div>

          <div className="email-notice">
            <span className="mail-icon">✉</span>

            <p>
              Enter the 6-digit verification code sent to your email address.
            </p>
          </div>

          {/* ERROR */}
          {error && <div className="error-message">{error}</div>}

          {/* SUCCESS */}
          {success && <div className="success-message">{success}</div>}

          {/* VERIFICATION FORM */}
          <form onSubmit={handleVerify}>
            <div className="code-field">
              <label htmlFor="code">Verification Code</label>

              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                required
              />
            </div>

            {/* EXPIRATION */}
            <div className="timer-section">
              <span>Code expiration</span>

              <strong className={remainingSeconds === 0 ? "expired" : ""}>
                {remainingSeconds === 0
                  ? "Timer ended"
                  : formatTime(remainingSeconds)}
              </strong>
            </div>

            {/* VERIFY BUTTON */}
            <button
              type="submit"
              className="verify-button"
              disabled={loading || code.length !== 6}
            >
              {loading ? "VERIFYING..." : "VERIFY EMAIL"}
            </button>
          </form>

          {/* RESEND */}
          <div className="resend-section">
            <p>Didn't receive your verification code?</p>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending || resendSeconds > 0}
              className="resend-button"
            >
              {resending
                ? "SENDING..."
                : resendSeconds > 0
                  ? `RESEND CODE IN ${resendSeconds}s`
                  : "RESEND VERIFICATION CODE"}
            </button>
          </div>

          {/* LOGIN */}
          <div className="login-section">
            <p>Already verified?</p>

            <Link to="/login">Log in to your account</Link>
          </div>

          {/* BACK */}
          <Link to="/register" className="back-link">
            ← Back to Registration
          </Link>
        </div>
      </main>

      <style>{`
        .verify-page {
          min-height: 100vh;
          width: 100%;
          position: relative;
          overflow-x: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: "Segoe UI", system-ui, sans-serif;
          background-image: url("/background.jpg");
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
        }

        .background-overlay {
          position: fixed;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(3, 18, 45, 0.78),
            rgba(16, 64, 130, 0.60),
            rgba(5, 28, 65, 0.78)
          );
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          z-index: 0;
        }

        .blur-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.45;
          pointer-events: none;
          animation: floatOrb 10s ease-in-out infinite;
          z-index: 1;
        }

        .orb-one {
          width: 350px;
          height: 350px;
          background: rgba(35, 115, 255, 0.65);
          top: -120px;
          left: -80px;
        }

        .orb-two {
          width: 300px;
          height: 300px;
          background: rgba(0, 180, 255, 0.40);
          right: -80px;
          bottom: -100px;
          animation-delay: -3s;
        }

        .orb-three {
          width: 220px;
          height: 220px;
          background: rgba(255, 60, 60, 0.28);
          left: 45%;
          top: 5%;
          animation-delay: -6s;
        }

        .verify-wrapper {
          width: 100%;
          max-width: 520px;
          padding: 25px 18px;
          position: relative;
          z-index: 5;
          animation: pageEnter 0.9s ease-out;
        }

        .verify-card {
          width: 100%;
          box-sizing: border-box;
          padding: 32px 38px;
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.90);
          border: 1px solid rgba(255, 255, 255, 0.35);
          box-shadow:
            0 30px 80px rgba(0, 0, 0, 0.40),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          animation: cardEnter 0.9s ease-out;
        }

        .logo-wrapper {
          width: 82px;
          height: 82px;
          margin: 0 auto 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.14);
          animation: logoFloat 4s ease-in-out infinite;
        }

        .logo {
          width: 68px;
          height: 68px;
          object-fit: contain;
        }

        .verify-card h1 {
          margin: 0;
          text-align: center;
          font-size: 38px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: 4px;
          color: #182235;
        }

        .brand-line {
          width: 48px;
          height: 4px;
          border-radius: 10px;
          background: #ef4444;
          margin: 10px auto 15px;
        }

        .verify-card h2 {
          text-align: center;
          color: #182235;
          font-size: 21px;
          margin: 0 0 8px;
        }

        .subtitle {
          margin: 0 0 22px;
          text-align: center;
          font-size: 13px;
          line-height: 1.6;
          color: #64748b;
        }

        .email-section {
          margin-bottom: 15px;
        }

        .email-section label,
        .code-field label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .email-section input,
        .code-field input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 13px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.85);
          color: #1f2937;
          font-size: 14px;
          outline: none;
          transition: border 0.25s ease, box-shadow 0.25s ease;
        }

        .email-section input:focus,
        .code-field input:focus {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
        }

        .email-notice {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          margin-bottom: 16px;
          border-radius: 10px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
        }

        .mail-icon {
          font-size: 23px;
        }

        .email-notice p {
          margin: 0;
          color: #1e40af;
          font-size: 12px;
          line-height: 1.5;
        }

        .error-message,
        .success-message {
          border-radius: 10px;
          padding: 11px 14px;
          margin-bottom: 15px;
          font-size: 13px;
        }

        .error-message {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #dc2626;
        }

        .success-message {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
        }

        .code-field {
          margin-bottom: 14px;
        }

        .code-field input {
          text-align: center;
          font-size: 27px;
          font-weight: 800;
          letter-spacing: 12px;
          padding: 14px;
        }

        .timer-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 17px;
          font-size: 12px;
          color: #64748b;
        }

        .timer-section strong {
          color: #17365D;
          font-size: 14px;
        }

        .timer-section strong.expired {
          color: #dc2626;
        }

        .verify-button {
          width: 100%;
          padding: 13px;
          border: none;
          border-radius: 11px;
          background: linear-gradient(135deg, #ff3b45, #e62935);
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(230, 41, 53, 0.25);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .verify-button:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 14px 30px rgba(230, 41, 53, 0.35);
        }

        .verify-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          box-shadow: none;
        }

        .resend-section {
          text-align: center;
          margin-top: 22px;
        }

        .resend-section p {
          margin: 0 0 7px;
          font-size: 12px;
          color: #64748b;
        }

        .resend-button {
          border: none;
          background: transparent;
          color: #ef4444;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .resend-button:disabled {
          color: #9ca3af;
          cursor: not-allowed;
        }

        .login-section {
          text-align: center;
          margin-top: 20px;
        }

        .login-section p {
          margin: 0;
          font-size: 13px;
          color: #64748b;
        }

        .login-section a {
          display: inline-block;
          margin-top: 4px;
          color: #ef4444;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
        }

        .back-link {
          display: block;
          margin-top: 17px;
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
          text-decoration: none;
        }

        .back-link:hover {
          color: #475569;
        }

        @keyframes pageEnter {
          from {
            opacity: 0;
            transform: translateY(25px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes cardEnter {
          from {
            opacity: 0;
            transform: translateY(35px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes logoFloat {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-7px) rotate(1deg);
          }
        }

        @keyframes floatOrb {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -25px) scale(1.08);
          }
        }

        @media (max-width: 500px) {
          .verify-wrapper {
            padding: 18px 12px;
          }

          .verify-card {
            padding: 25px 22px;
            border-radius: 22px;
          }

          .logo-wrapper {
            width: 72px;
            height: 72px;
          }

          .logo {
            width: 60px;
            height: 60px;
          }

          .verify-card h1 {
            font-size: 32px;
            letter-spacing: 3px;
          }

          .code-field input {
            letter-spacing: 8px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
};

export default VerifyEmail;
