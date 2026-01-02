import re

DEFAULT_LENGTH = 160

def strip_markdown(markdown: str) -> str:
    text = re.sub(r'```[\s\S]*?```', ' ', markdown)
    text = re.sub(r'`[^`]*`', ' ', text)
    text = re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', text)
    text = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', text)
    text = re.sub(r'^>+', ' ', text, flags=re.MULTILINE)
    text = re.sub(r'[#*_~`+\-]', ' ', text)
    text = re.sub(r'\|', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def create_excerpt(markdown: str, length: int = DEFAULT_LENGTH) -> str:
    plain = strip_markdown(markdown)
    if len(plain) <= length:
        return plain
    
    truncated = plain[:length].rstrip()
    return f"{truncated}…"
