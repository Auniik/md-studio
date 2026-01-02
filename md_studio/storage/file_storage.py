from abc import ABC, abstractmethod
from typing import List, Optional, Dict
from pathlib import Path

class BaseStorage(ABC):
    @abstractmethod
    async def list_documents(self, query: str, page: int, page_size: int, sort_by: str, filter_by: str) -> Dict:
        pass
    
    @abstractmethod
    async def get_document(self, slug: str) -> Optional[Dict]:
        pass
    
    @abstractmethod
    async def create_document(self, data: Dict) -> Dict:
        pass
    
    @abstractmethod
    async def update_document(self, slug: str, data: Dict) -> Dict:
        pass
    
    @abstractmethod
    async def delete_document(self, slug: str) -> bool:
        pass
    
    @abstractmethod
    async def toggle_public(self, slug: str) -> Dict:
        pass
