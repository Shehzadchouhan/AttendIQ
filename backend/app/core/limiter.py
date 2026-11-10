"""
Rate Limiter Configuration with SlowAPI.
Includes graceful fallback if slowapi is not yet installed in the current environment.
"""
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded

    limiter = Limiter(key_func=get_remote_address)
    HAS_SLOWAPI = True
except ImportError:
    HAS_SLOWAPI = False

    class DummyLimiter:
        def limit(self, *args, **kwargs):
            def decorator(func):
                return func
            return decorator

    limiter = DummyLimiter()
    RateLimitExceeded = None
    _rate_limit_exceeded_handler = None
