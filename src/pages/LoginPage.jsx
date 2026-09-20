import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { getMe, sendOtp, verifyOtp } from '../lib/parentApi';
import { isAuthenticated, setCachedParent, setSelectedChildId, setToken } from '../lib/auth';
import { DEMO_MODE } from '../lib/api';
import { asset, href } from '../lib/paths';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';
import LoginHero from '../components/LoginHero';
import CountryCodeSelect from '../components/CountryCodeSelect';

// authenticate.php sends a 4-digit code (rand(1000, 9999)).
const OTP_LENGTH = 4;
const OTP_RESEND_DEFAULT_SECONDS = 119;
const DEFAULT_ROUTE = '/performance';
const COUNTRY_CODE_STORAGE_KEY = 'pp_country_code';

// Same list as the candidate portal: India plus the Gulf countries the centre
// enrols from.
const COUNTRIES = [
  { code: '+91', flag: '🇮🇳', name: 'India', digits: 10, regex: /^[6-9]\d{9}$/ },
  { code: '+973', flag: '🇧🇭', name: 'Bahrain', digits: 8, regex: /^\d{8}$/ },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait', digits: 8, regex: /^\d{8}$/ },
  { code: '+968', flag: '🇴🇲', name: 'Oman', digits: 8, regex: /^\d{8}$/ },
  { code: '+974', flag: '🇶🇦', name: 'Qatar', digits: 8, regex: /^\d{8}$/ },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia', digits: 9, regex: /^\d{9}$/ },
  { code: '+971', flag: '🇦🇪', name: 'United Arab Emirates', digits: 9, regex: /^\d{9}$/ },
];

const countryByCode = (code) => COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];

function loadStoredCountryCode() {
  try {
    const stored = window.localStorage.getItem(COUNTRY_CODE_STORAGE_KEY);
    return COUNTRIES.some((c) => c.code === stored) ? stored : '+91';
  } catch {
    return '+91';
  }
}

function maskMobile(countryCode, mobile) {
  const digits = String(mobile || '').split('');
  for (let i = 2; i < digits.length - 2; i += 1) digits[i] = 'X';
  return `${countryCode} ${digits.join('')}`;
}

function formatResendCountdown(seconds) {
  const safe = Math.max(0, parseInt(seconds, 10) || 0);
  const m = String(Math.floor(safe / 60)).padStart(2, '0');
  const s = String(safe % 60).padStart(2, '0');
  return `Resend in ${m}:${s} ${safe >= 60 ? 'min' : 'sec'}`;
}

/**
 * Two-step login: mobile number -> 4-digit OTP, laid out like the candidate
 * portal (illustration beside the card on wide screens). No passwords;
 * parents log in with the number registered against their child
 * (parent_profiles.mobile).
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [countryCode, setCountryCode] = useState(loadStoredCountryCode);
  const [mobile, setMobile] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [step, setStep] = useState('mobile'); // 'mobile' | 'otp'
  const [otp, setOtp] = useState(Array.from({ length: OTP_LENGTH }, () => ''));
  const [otpKey, setOtpKey] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(null); // null = hidden
  const [resendSending, setResendSending] = useState(false);
  const otpRefs = useRef([]);
  const mobileRef = useRef(null);

  const country = countryByCode(countryCode);

  useEffect(() => {
    document.title = 'Login · Crispr Learning Parent Portal';
    mobileRef.current?.focus();
  }, []);

  // Resend countdown.
  useEffect(() => {
    if (resendSeconds === null || resendSeconds <= 0) return undefined;
    const id = setInterval(() => setResendSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [resendSeconds]);

  useEffect(() => {
    if (step === 'otp') otpRefs.current[0]?.focus();
  }, [step]);

  if (isAuthenticated()) return <Navigate to={DEFAULT_ROUTE} replace />;

  function resolveNextPath() {
    const next = new URLSearchParams(location.search).get('next');
    if (next && next.startsWith('/') && !next.startsWith('//') && next !== '/login') return next;
    return DEFAULT_ROUTE;
  }

  function validateMobile(value) {
    setMobileError(country.regex.test(value) ? '' : 'Invalid mobile number');
  }

  function handleCountryChange(next) {
    try { window.localStorage.setItem(COUNTRY_CODE_STORAGE_KEY, next); } catch { /* ignore */ }
    setCountryCode(next);
    const cfg = countryByCode(next);
    const trimmed = mobile.replace(/\D/g, '').slice(0, cfg.digits);
    setMobile(trimmed);
    setMobileError(trimmed.length > 0 && !cfg.regex.test(trimmed) ? 'Invalid mobile number' : '');
    mobileRef.current?.focus();
  }

  function handleMobileInput(e) {
    const value = e.target.value.replace(/\D/g, '').slice(0, country.digits);
    setMobile(value);
    if (value.length === country.digits) validateMobile(value);
    else setMobileError('');
  }

  async function handleSendOtp(isResend = false) {
    if (!country.regex.test(mobile)) {
      setMobileError('Invalid mobile number');
      if (isResend) { setResendSending(false); setResendSeconds(0); }
      return;
    }
    setMobileError('');
    setSending(true);
    try {
      const res = await sendOtp({ mobile, countryCode: country.code });
      setOtpKey(res?.key || '');
      setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
      setStep('otp');
      setResendSending(false);
      setResendSeconds(res?.expiresIn || OTP_RESEND_DEFAULT_SECONDS);
      toast(res?.message || `OTP sent to ${maskMobile(country.code, mobile)}`);
    } catch (err) {
      toast(err?.response?.data?.error || err?.message || 'Could not send OTP. Please try again.');
      // The server may already have a live OTP for this number: move on and
      // let the parent type it, with the resend timer set to what is left.
      if (err?.retryAfter > 0) {
        setStep('otp');
        setResendSending(false);
        setResendSeconds(err.retryAfter);
      } else if (isResend) {
        setResendSending(false);
        setResendSeconds(0);
      }
    } finally {
      setSending(false);
    }
  }

  function handleResendOtp() {
    setResendSending(true);
    handleSendOtp(true);
  }

  async function handleVerify() {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      toast(`Please enter all ${OTP_LENGTH} digits of the one-time passcode`);
      otpRefs.current[OTP_LENGTH - 1]?.focus();
      return;
    }
    setVerifying(true);
    try {
      const res = await verifyOtp({ mobile, countryCode: country.code, otp: code, key: otpKey });
      if (!res?.token) throw new Error('Login failed. Please try again.');
      setToken(res.token);
      // Identity + children in the portal's Child shape come from me.php
      // (demo mode already returns them on the login call).
      let parent = res.parent;
      let children = res.children || [];
      if (!parent) {
        const me = await getMe();
        parent = me.parent;
        children = me.children || [];
      }
      setCachedParent({ parent, children });
      setSelectedChildId(children[0]?.id);
      // Hard navigation so StudentProvider mounts fresh for this parent.
      window.location.assign(href(resolveNextPath()));
    } catch (err) {
      toast(err?.response?.data?.error || err?.message || 'Incorrect OTP.');
      setVerifying(false);
      otpRefs.current[OTP_LENGTH - 1]?.focus();
    }
  }

  function handleOtpInput(index, e) {
    const value = e.target.value.replace(/\D/g, '').slice(-1);
    setOtp((current) => { const next = [...current]; next[index] = value; return next; });
    if (value.length === 1 && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && otp[index].length === 0 && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      handleVerify();
    }
  }

  // A pasted code fills every box at once.
  function handleOtpPaste(e) {
    const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!text) return;
    e.preventDefault();
    setOtp(Array.from({ length: OTP_LENGTH }, (_, i) => text[i] || ''));
    otpRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  }

  function changeNumber() {
    setStep('mobile');
    setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
    setResendSeconds(null);
    setMobileError('');
  }

  const buttonLabel = country.code === '+91' ? 'Get OTP on Phone' : 'Get OTP on WhatsApp';

  return (
    <div className="pp-login">
      <header className="pp-login-brand">
        <img src={asset('logo/crispr-logo.svg')} alt="Crispr Learning" />
      </header>

      <div className="pp-login-split">
        <LoginHero />

        <div className="pp-login-card">
          {step === 'mobile' ? (
            <div>
              <h1>Parent login</h1>
              <p className="pp-login-sub">Please enter the mobile number registered with your child's admission.</p>

              <div className="pp-field">
                <label className="pp-label" htmlFor="pp-login-mobile">Mobile number</label>
                <div className="pp-phone">
                  <div className="pp-input-group">
                    <CountryCodeSelect countries={COUNTRIES} value={countryCode} onChange={handleCountryChange} />
                    <input
                      id="pp-login-mobile"
                      ref={mobileRef}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="Mobile number"
                      maxLength={country.digits}
                      value={mobile}
                      onChange={handleMobileInput}
                      onBlur={() => { if (mobile.length > 0) validateMobile(mobile); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSendOtp(); }}
                      required
                    />
                  </div>
                </div>
              </div>

              <button type="button" className="pp-btn pp-btn-primary pp-btn-block continue-btn" onClick={() => handleSendOtp()} disabled={sending}>
                <span>{buttonLabel}</span>
                {sending && <span className="pp-btn-loader"><div className="loader" /></span>}
              </button>
            </div>
          ) : (
            <div>
              <h2>Continue <span>as {maskMobile(country.code, mobile)}</span></h2>
              <p className="pp-login-sub">
                Please enter the one-time passcode.{' '}
                <button type="button" className="pp-link" onClick={changeNumber} disabled={verifying}>Change number</button>
              </p>
              <div className="pp-otp">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    className="otpEntry"
                    type="tel"
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    aria-label={`OTP digit ${i + 1}`}
                    value={digit}
                    onChange={(e) => handleOtpInput(i, e)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={handleOtpPaste}
                    required
                  />
                ))}
              </div>
              {resendSeconds !== null && (
                <button
                  type="button"
                  className="resend-btn pp-link"
                  onClick={handleResendOtp}
                  disabled={resendSending || resendSeconds > 0}
                >
                  {resendSending ? 'Sending...' : resendSeconds > 0 ? formatResendCountdown(resendSeconds) : 'Resend OTP'}
                </button>
              )}

              <button type="button" className="pp-btn pp-btn-primary pp-btn-block continue-btn" onClick={handleVerify} disabled={verifying}>
                <span>Login Now</span>
                {verifying && <span className="pp-btn-loader"><div className="loader" /></span>}
              </button>
            </div>
          )}

          <div className="pp-field-error">
            <p>{mobileError}</p>
          </div>

          {DEMO_MODE && (
            <div className="pp-login-demo">
              <Icon.Shield width={16} height={16} />
              <span>Demo mode: any valid number works, OTP is <strong>1234</strong>.</span>
            </div>
          )}

          <p className="pp-login-terms">
            By continuing you agree to all our <a href="https://crisprlearning.com/terms-and-conditions/" target="_blank" rel="noopener noreferrer">Terms and Conditions</a>
          </p>
        </div>
      </div>

      <p className="pp-login-foot">Trouble signing in? Call your centre or WhatsApp +91 484 233 4455.</p>
    </div>
  );
}
