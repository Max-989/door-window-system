# Settings Configuration Patterns

## Safe Override of Nested Settings

When overriding nested settings like `REST_FRAMEWORK` in environment-specific config files (dev.py, prod.py, test.py), always use `copy.deepcopy` to preserve base configuration:

```python
import copy
from .base import *

REST_FRAMEWORK = copy.deepcopy(REST_FRAMEWORK)
# Modify only the keys you need
REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = (
    "rest_framework_simplejwt.authentication.JWTAuthentication",
    "rest_framework.authentication.SessionAuthentication",  # Add for dev
)
```

This prevents accidental loss of critical configuration like `DEFAULT_AUTHENTICATION_CLASSES`, `DEFAULT_PERMISSION_CLASSES`, etc.

## Environment Variables

- `DJANGO_SECRET_KEY` is required (no default in base.py).
- `DEBUG = False` in base.py, overridden to `True` in dev.py.
- Database: MySQL in production, SQLite in development.
- CORS: Allow all origins in dev, restrict to actual domains in prod.

## Test Settings

Use `config.settings.test` for running tests with in-memory SQLite and faster password hashing.