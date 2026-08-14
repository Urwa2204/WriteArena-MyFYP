from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/writearena"
    SECRET_KEY: str = "change-this-to-a-random-secret-key-at-least-32-characters"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ADMIN_USERNAME: str = "admin"
    ADMIN_EMAIL: str = "admin@writearena.com"
    ADMIN_PASSWORD: str = "Admin1234!"
    HF_MODEL: str = "Hello-SimpleAI/chatgpt-detector-roberta"
    ENV: str = "development"

    # ---- Google Sign-In (OAuth) ----
    # Create an OAuth 2.0 Client ID (type "Web application") in Google Cloud
    # Console, add your frontend origin(s) to "Authorized JavaScript origins",
    # and put the client ID here. Leave blank to disable the Google button.
    GOOGLE_CLIENT_ID: str = ""

    # ---- Email (for OTP verification & password reset) ----
    # Two real-delivery options, tried in this order, with console-print as the
    # last resort so local dev never breaks:
    #   1. Resend (https://resend.com) — simplest to set up, just an API key.
    #   2. SMTP — works with Gmail (App Password), SendGrid, Mailgun, etc.
    # Leave both blank to fall back to printing codes to the server console.
    RESEND_API_KEY: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True          # True = STARTTLS on 587; False = SSL on 465
    EMAIL_FROM: str = "WriteArena <no-reply@writearena.com>"
    OTP_TTL_SECONDS: int = 600         # codes expire after 10 minutes

    # Public HTTPS base URL of this deployment — required for live payment
    # provider return/callback URLs. Not used in sandbox mode.
    PUBLIC_BASE_URL: str = "http://localhost:8000"

    # Comma-separated list of allowed frontend origins for CORS. Defaults
    # cover local dev only — set this to your real deployed frontend
    # origin(s) (e.g. https://yourapp.hf.space) before deploying, or the
    # browser will reject every API call with a CORS error.
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # ---- Pricing (PKR; USD shown at USD_RATE) ----
    PRICE_COACH: int = 500
    PRICE_CERTIFICATE: int = 100
    PRICE_STREAK_FREEZE: int = 300
    PRICE_TOURNAMENT_ENTRY: int = 150
    USD_RATE: float = 280.0
    CERT_MIN_SCORE: float = 95.0
    CERT_MIN_STREAK: int = 7

    # ---- Payments (JazzCash / EasyPaisa / NayaPay) ----
    PAYMENTS_MODE: str = "sandbox"     # "sandbox" auto-completes; "live" uses creds below
    JAZZCASH_MERCHANT_ID: str = ""
    JAZZCASH_PASSWORD: str = ""
    JAZZCASH_INTEGRITY_SALT: str = ""
    EASYPAISA_STORE_ID: str = ""
    EASYPAISA_HASH_KEY: str = ""
    NAYAPAY_CLIENT_ID: str = ""
    NAYAPAY_API_KEY: str = ""

    # ---- AI writing coach ----
    COACH_API_BASE: str = "https://api.openai.com/v1"
    COACH_API_KEY: str = ""
    COACH_MODEL: str = "gpt-4o-mini"
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"

    class Config:
        env_file = ".env"

settings = Settings()
