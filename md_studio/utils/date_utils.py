from datetime import datetime
from typing import Union

def format_relative_date(date: Union[str, datetime]) -> str:
    now = datetime.now()
    then = datetime.fromisoformat(date) if isinstance(date, str) else date
    diff_seconds = int((now - then).total_seconds())
    
    if diff_seconds < 60:
        return "just now"
    
    diff_minutes = diff_seconds // 60
    if diff_minutes < 60:
        return f"{diff_minutes} {'minute' if diff_minutes == 1 else 'minutes'} ago"
    
    diff_hours = diff_minutes // 60
    if diff_hours < 24:
        return f"{diff_hours} {'hour' if diff_hours == 1 else 'hours'} ago"
    
    diff_days = diff_hours // 24
    if diff_days < 7:
        return f"{diff_days} {'day' if diff_days == 1 else 'days'} ago"
    
    if diff_days < 30:
        weeks = diff_days // 7
        return f"{weeks} {'week' if weeks == 1 else 'weeks'} ago"
    
    return then.strftime("%b %d, %Y")

def calculate_reading_time(text: str) -> int:
    words_per_minute = 200
    words = len([w for w in text.strip().split() if w])
    minutes = (words + words_per_minute - 1) // words_per_minute
    return max(1, minutes)
