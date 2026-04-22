"""
Development settings - inherits from base.
Uses SQLite for local dev, enables debug toolbar features.
"""
import copy
from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Use SQLite for development (no MySQL needed)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
    }
}

CORS_ALLOW_ALL_ORIGINS = True  # Dev: allow all origins
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
]

# Show emails in console
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# REST_FRAMEWORK: safe merge to preserve base configuration
REST_FRAMEWORK = copy.deepcopy(REST_FRAMEWORK)
# Add SessionAuthentication for browsable API login in development
REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = (
    "rest_framework_simplejwt.authentication.JWTAuthentication",
    "rest_framework.authentication.SessionAuthentication",
)
