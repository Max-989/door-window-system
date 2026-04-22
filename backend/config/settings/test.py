"""
Test settings - used for CI/CD and local testing.
Uses SQLite in-memory database for fast tests.
"""

import os
import tempfile
from datetime import timedelta

from .base import *  # noqa: F401, F403

DEBUG = False

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]

# Use SQLite in-memory database for fast tests
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",  # In-memory SQLite for fastest tests
        "TEST": {
            "NAME": ":memory:",  # Also use in-memory for test database
        },
    }
}

# Disable password validators for testing
AUTH_PASSWORD_VALIDATORS = []

# Use faster password hasher for tests
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Disable logging during tests
LOGGING = {
    "version": 1,
    "disable_existing_loggers": True,
    "handlers": {
        "null": {
            "class": "logging.NullHandler",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["null"],
            "level": "CRITICAL",
        },
        "django.request": {
            "handlers": ["null"],
            "level": "CRITICAL",
            "propagate": False,
        },
    },
}

# Use console email backend
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Use local memory cache for tests (health check needs cache to work)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "unique-snowflake",
    }
}

# Use simple JWT settings for tests
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=5),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": "test-secret-key-change-in-production",
    "VERIFYING_KEY": None,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
}

# Enable test mode
TESTING = True

# Static files for tests
STATIC_ROOT = tempfile.mkdtemp()
MEDIA_ROOT = tempfile.mkdtemp()

# Disable CORS for tests
CORS_ALLOW_ALL_ORIGINS = True

# Redis configuration for tests (use mock or dummy)
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

# Celery configuration for tests
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ALWAYS_EAGER = True  # Run tasks synchronously during tests
CELERY_EAGER_PROPAGATES_EXCEPTIONS = True
