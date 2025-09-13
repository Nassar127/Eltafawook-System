import re

_EG_LOCAL = re.compile(r"^0(10|11|12|15)\d{8}$")

def normalize_eg_phone(raw: str | None) -> str | None:
    """
    Accepts input like '01123456789' (11 digits starting with 01…)
    Returns E.164 '+20XXXXXXXXXX' (drop leading 0, prefix +20).
    """
    if raw is None:
        return None
    s = re.sub(r"\D", "", raw)
    if s.startswith("20") and len(s) == 12:
        s = "0" + s[2:]
    if not _EG_LOCAL.fullmatch(s):
        raise ValueError("Phone must be 11 digits, start with 01, e.g. 01123456789")
    return "+20" + s[1:]
