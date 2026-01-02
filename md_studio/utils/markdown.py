import markdown
import bleach
from typing import Optional

ALLOWED_TAGS = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'a', 'img',
    'strong', 'em', 'code', 'pre',
    'blockquote',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span',
    'del', 'ins', 'input',
]

ALLOWED_ATTRS = {
    '*': ['class', 'id'],
    'a': ['href', 'title'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'td': ['align'],
    'th': ['align'],
    'input': ['type', 'checked', 'disabled'],
}

def normalize_source(source: str, base_path: Optional[str] = None) -> str:
    if not base_path:
        return source
    
    import re
    return re.sub(
        r'!\[([^\]]*)\]\((\/uploads\/[^)]+)\)',
        lambda m: f"![{m.group(1)}]({base_path}{m.group(2)})",
        source
    )

def markdown_to_html(content: str, base_path: Optional[str] = None) -> str:
    normalized = normalize_source(content, base_path)
    
    md = markdown.Markdown(
        extensions=[
            'extra',
            'codehilite',
            'fenced_code',
            'tables',
            'nl2br',
        ],
        extension_configs={
            'codehilite': {
                'css_class': 'highlight',
                'linenums': False,
            }
        }
    )
    
    raw_html = md.convert(normalized)
    clean_html = bleach.clean(
        raw_html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        strip=False
    )
    
    return clean_html
