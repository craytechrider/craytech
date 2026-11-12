import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../lib/api";

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState<string>(location.state?.email || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [cooldown, setCooldown] = useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.post("/password/forgot", { email });

      setStep(2);
      setCooldown(60);

      setSuccess(
        "If your email is registered, a password reset code has been sent. Please check your inbox.",
      );
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Unable to send the reset code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/password/reset", {
        email,
        code,
        password,
        password_confirmation: passwordConfirmation,
      });

      setSuccess(
        response.data.message ||
          "Password reset successfully. You can now log in.",
      );

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1800);
    } catch (err: any) {
      const errors = err.response?.data?.errors;

      setError(
        errors?.code?.[0] ||
          errors?.password?.[0] ||
          err.response?.data?.message ||
          "Unable to reset your password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await api.post("/password/forgot", { email });

      setSuccess(
        response.data.message ||
          "If your email is registered, a new code will be sent.",
      );

      setCooldown(60);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Unable to resend the code. Please try again.",
      );

      if (err.response?.status === 429) {
        setCooldown(60);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-overlay" />

      <main className="forgot-wrapper">
        <section className="forgot-card">
          <div className="forgot-logo">
            <img src="/craytech-logo.png" alt="CRAYTECH Logo" />
          </div>

          <div className="forgot-brand">
            <h1>CRAYTECH</h1>
            <div />
            <p>Crayfish Farm Management System</p>
          </div>

          <h2>{step === 1 ? "Forgot Password?" : "Reset Your Password"}</h2>

          <p className="forgot-description">
            {step === 1
              ? "Enter your registered email address. We'll send you a 6-digit password reset code."
              : `Enter the 6-digit code sent to ${email} and create your new password.`}
          </p>

          {error && <div className="forgot-error">{error}</div>}
          {success && <div className="forgot-success">{success}</div>}

          {step === 1 ? (
            <form onSubmit={handleSendCode}>
              <label htmlFor="reset-email">Email address</label>

              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                autoComplete="email"
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? "SENDING CODE..." : "SEND RESET CODE"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <label htmlFor="reset-code">6-digit verification code</label>

              <input
                id="reset-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Enter 6-digit code"
                autoComplete="one-time-code"
                required
              />

              <label htmlFor="new-password">New password</label>

              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                autoComplete="new-password"
                minLength={8}
                required
              />

              <label htmlFor="confirm-password">Confirm new password</label>

              <input
                id="confirm-password"
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="Confirm your new password"
                autoComplete="new-password"
                minLength={8}
                required
              />

              <button type="submit" disabled={loading || code.length !== 6}>
                {loading ? "RESETTING PASSWORD..." : "RESET PASSWORD"}
              </button>

              <div className="forgot-resend">
                <span>Didn't receive the code?</span>

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading || cooldown > 0}
                >
                  {cooldown > 0 ? `RESEND IN ${cooldown}s` : "RESEND CODE"}
                </button>
              </div>

              <button
                type="button"
                className="change-email"
                onClick={() => {
                  setStep(1);
                  setCode("");
                  setPassword("");
                  setPasswordConfirmation("");
                  setError("");
                  setSuccess("");
                }}
              >
                Change email address
              </button>
            </form>
          )}

          <Link to="/login" className="forgot-back">
            ← Back to Login
          </Link>
        </section>

        <footer>© {new Date().getFullYear()} CRAYTECH</footer>
      </main>

      <style>{`
        .forgot-page {
          min-height: 100vh;
          width: 100%;
          position: relative;
          overflow-x: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: "Segoe UI", system-ui, sans-serif;
          background: url("/background.jpg") center / cover fixed;
          box-sizing: border-box;
        }

        .forgot-overlay {
          position: fixed;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(3, 18, 45, 0.84),
            rgba(16, 64, 130, 0.68),
            rgba(5, 28, 65, 0.84)
          );
          backdrop-filter: blur(6px);
        }

        .forgot-wrapper {
          width: 100%;
          max-width: 460px;
          padding: 20px;
          position: relative;
          z-index: 2;
          box-sizing: border-box;
        }

        .forgot-card {
          padding: 30px 36px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 25px 65px rgba(0, 0, 0, 0.38);
          backdrop-filter: blur(22px);
          box-sizing: border-box;
        }

        .forgot-logo {
          width: 78px;
          height: 78px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 18px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.13);
        }

        .forgot-logo img {
          width: 65px;
          height: 65px;
          object-fit: contain;
        }

        .forgot-brand {
          text-align: center;
        }

        .forgot-brand h1 {
          margin: 0;
          color: #182235;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: 3px;
        }

        .forgot-brand div {
          width: 38px;
          height: 3px;
          margin: 9px auto;
          border-radius: 10px;
          background: #ef4444;
        }

        .forgot-brand p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
        }

        .forgot-card h2 {
          margin: 24px 0 8px;
          color: #182235;
          text-align: center;
          font-size: 21px;
        }

        .forgot-description {
          margin: 0 0 20px;
          color: #64748b;
          text-align: center;
          font-size: 13px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .forgot-card form label {
          display: block;
          margin: 14px 0 6px;
          color: #334155;
          font-size: 12px;
          font-weight: 700;
        }

        .forgot-card input {
          width: 100%;
          height: 44px;
          box-sizing: border-box;
          padding: 0 13px;
          border: 1px solid #d7dee8;
          border-radius: 9px;
          background: #f8fafc;
          color: #172033;
          font-size: 13px;
          outline: none;
        }

        .forgot-card input:focus {
          background: white;
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .forgot-card form > button[type="submit"] {
          width: 100%;
          height: 46px;
          margin-top: 20px;
          border: none;
          border-radius: 10px;
          color: white;
          background: linear-gradient(135deg, #ff3b45, #e62935);
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .forgot-card button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .forgot-error,
        .forgot-success {
          padding: 10px 12px;
          margin-bottom: 14px;
          border-radius: 9px;
          font-size: 12px;
          line-height: 1.5;
        }

        .forgot-error {
          color: #be123c;
          background: #fff1f2;
          border: 1px solid #fecdd3;
        }

        .forgot-success {
          color: #166534;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
        }

        .forgot-resend {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 18px;
          color: #64748b;
          font-size: 12px;
        }

        .forgot-resend button,
        .change-email {
          border: none;
          background: none;
          color: #e62935;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .change-email {
          display: block;
          margin: 12px auto 0;
        }

        .forgot-back {
          display: block;
          margin-top: 20px;
          color: #64748b;
          text-align: center;
          text-decoration: none;
          font-size: 12px;
        }

        .forgot-back:hover {
          color: #182235;
        }

        .forgot-wrapper footer {
          margin-top: 12px;
          color: rgba(255, 255, 255, 0.72);
          text-align: center;
          font-size: 11px;
        }

        @media (max-width: 480px) {
          .forgot-card {
            padding: 26px 22px;
          }
        }
      `}</style>
    </div>
  );
};

export default ForgotPassword;
