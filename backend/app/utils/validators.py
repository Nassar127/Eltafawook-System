import re

_digits = re.compile(r"\D+")

def normalize_phone(s: str | None) -> str | None:
    if not s:
        return None
    d = _digits.sub("", s)
    if not d:
        return None
    return d[-10:] if len(d) >= 10 else d
