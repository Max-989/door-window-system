# Common Module Patterns

## Utils Package Structure

To avoid Python import conflicts between `common/utils.py` and `common/utils/` directory, the `utils.py` file has been renamed to `utils_core.py`. A `common/utils/__init__.py` file re-exports all public functions and classes:

```python
from ..utils_core import (
    generate_order_no,
    generate_request_no,
    generate_task_no,
    JSONField,
)
```

Existing imports `from common.utils import ...` continue to work because they resolve to the package.

## JSONField Compatibility

For SQLite compatibility, a placeholder `JSONField` class exists in `utils_core.py`. In production MySQL, use `django.db.models.JSONField` directly.

## Order and Task Number Generation

Functions `generate_order_no`, `generate_request_no`, `generate_task_no` create formatted IDs with date prefix and random suffix. Used by order, measurement, installation, and maintenance modules.

## Unified Response Format

Use `common.responses.success()`, `common.responses.created()`, and `common.responses.error()` for consistent API responses. These functions wrap data with `code`, `message`, `timestamp` fields. Use `created()` for HTTP 201 responses. Ensure error responses include appropriate HTTP status codes via `code` parameter.