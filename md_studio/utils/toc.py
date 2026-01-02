import re
from typing import List, Dict
from dataclasses import dataclass

@dataclass
class TocItem:
    id: str
    title: str
    level: int

def generate_heading_id(text: str) -> str:
    heading_id = text.lower()
    heading_id = re.sub(r'[^a-z0-9\s-]', '', heading_id)
    heading_id = re.sub(r'\s+', '-', heading_id)
    heading_id = re.sub(r'-+', '-', heading_id)
    return re.sub(r'^-|-$', '', heading_id)

def extract_table_of_contents(markdown: str) -> List[TocItem]:
    heading_regex = re.compile(r'^(#{2,3})\s+(.+)$', re.MULTILINE)
    toc: List[TocItem] = []
    id_counts: Dict[str, int] = {}
    
    for match in heading_regex.finditer(markdown):
        level = len(match.group(1))
        title = match.group(2).strip()
        heading_id = generate_heading_id(title)
        
        count = id_counts.get(heading_id, 0)
        if count > 0:
            heading_id = f"{heading_id}-{count}"
        id_counts[generate_heading_id(title)] = count + 1
        
        toc.append(TocItem(id=heading_id, title=title, level=level))
    
    return toc

class HeadingIdGenerator:
    def __init__(self):
        self.id_counts: Dict[str, int] = {}
    
    def generate(self, text: str) -> str:
        base_id = generate_heading_id(text)
        count = self.id_counts.get(base_id, 0)
        
        heading_id = base_id
        if count > 0:
            heading_id = f"{base_id}-{count}"
        
        self.id_counts[base_id] = count + 1
        return heading_id
    
    def reset(self) -> None:
        self.id_counts.clear()
