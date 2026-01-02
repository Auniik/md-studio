import os
import json
import uuid
import aiofiles
import aiofiles.os
from pathlib import Path
from typing import Any, TypeVar, Union

T = TypeVar('T')

async def ensure_dir(dir_path: Union[str, Path]) -> None:
    path = Path(dir_path)
    path.mkdir(parents=True, exist_ok=True)

async def path_exists(target_path: Union[str, Path]) -> bool:
    return Path(target_path).exists()

async def atomic_write_file(target_path: Union[str, Path], data: Union[str, bytes]) -> None:
    target = Path(target_path)
    await ensure_dir(target.parent)
    
    temp_path = target.parent / f".tmp-{target.name}-{uuid.uuid4()}"
    
    mode = 'wb' if isinstance(data, bytes) else 'w'
    async with aiofiles.open(temp_path, mode) as f:
        await f.write(data)
    
    os.rename(temp_path, target)

async def atomic_write_json(target_path: Union[str, Path], payload: Any) -> None:
    if isinstance(payload, str):
        formatted = payload
    else:
        formatted = json.dumps(payload, indent=2) + "\n"
    await atomic_write_file(target_path, formatted)

async def safe_read_json(target_path: Union[str, Path], fallback: T) -> T:
    try:
        async with aiofiles.open(target_path, 'r') as f:
            data = await f.read()
            return json.loads(data)
    except FileNotFoundError:
        return fallback
    except Exception:
        raise
