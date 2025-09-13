from __future__ import annotations
import time, urllib.parse, webbrowser
from typing import Dict
import pyautogui

def _to_e164(phone: str) -> str:
    p = "".join(ch for ch in (phone or "") if ch.isdigit() or ch == "+")
    if p.startswith("+"):
        return p
    if p.startswith("0"):
        return "+2" + p
    return "+" + p

def send_ready_message(phone: str, message: str, *, wait_open: float = 12.0, wait_after_send: float = 2.0) -> Dict[str, object]:
    """
    Robust WhatsApp-Web sender:
      - always opens a NEW tab
      - waits for the tab to load
      - presses Enter to send
    Returns: {"ok": True} or {"ok": False, "error": "..."}
    """
    try:
        phone_e164 = _to_e164(phone)
        url = "https://web.whatsapp.com/send?phone={}&text={}".format(
            urllib.parse.quote(phone_e164),
            urllib.parse.quote(message)
        )
        webbrowser.open_new_tab(url)
        time.sleep(wait_open)
        pyautogui.FAILSAFE = False
        pyautogui.press("enter")
        time.sleep(wait_after_send)
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}
