"""
Development settings - inherits from base.
Uses SQLite for local dev, enables debug toolbar features.
"""
from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Use SQLite for development (no MySQL needed)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

CORS_ALLOW_ALL_ORIGINS = True  # Dev: override to allow all origins

# Show emails in console
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
