import re
from typing import Callable, Awaitable, Optional

FALLBACK_SLUG = "document"

def slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    return re.sub(r'^-+|-+$', '', slug)

async def ensure_unique_slug(
    desired: Optional[str],
    fallback_title: str,
    is_available: Callable[[str], Awaitable[bool]]
) -> str:
    base = slugify(desired or fallback_title) or FALLBACK_SLUG
    candidate = base
    suffix = 2
    
    while not await is_available(candidate):
        candidate = f"{base}-{suffix}"
        suffix += 1
    
    return candidate
