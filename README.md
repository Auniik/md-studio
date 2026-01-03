# MD Studio

A standalone Python package that provides a modern Markdown CMS for FastAPI and Starlette applications. No Node.js runtime required.

## Features

- 📝 **Markdown-first**: Write content in Markdown with frontmatter support
- 🎨 **Modern UI**: React-based interface with dark mode
- 🚀 **Easy Integration**: Mount as ASGI middleware in any FastAPI/Starlette app
- 📁 **Flexible Storage**: Filesystem or S3 storage backends
- 🔒 **Public Sharing**: Share documents publicly with unique URLs
- 📤 **Import/Export**: Bulk operations with ZIP archives
- 🖼️ **File Uploads**: Built-in file upload and attachment handling
- 🔍 **Search & Filter**: Full-text search with sorting and filtering

## Installation

```bash
pip install md-studio
```

For S3 storage support:
```bash
pip install md-studio[s3]
```

For image processing:
```bash
pip install md-studio[image]
```

All optional dependencies:
```bash
pip install md-studio[all]
```

## Quick Start

### FastAPI

```python
from fastapi import FastAPI
from md_studio import MDStudio

app = FastAPI()

app.mount(
    "/md-studio",
    MDStudio(
        title="My Documentation",
        scan_dirs=["./docs", "./markdowns", "./"],
        write_dir="./docs",
    )
)
```

`scan_dirs` (required unless `SCAN_DIRS`/`WRITE_DIR` are set) controls where existing content is scanned.
`write_dir` selects where new/imported documents are saved.
Uploads default to `<write_dir>/uploads` unless `uploads_path` is provided.
`metadata_path` controls where the index metadata is stored (default: `<write_dir>/uploads/.md-studio-metadata.json`).

### Starlette

```python
from starlette.applications import Starlette
from starlette.routing import Mount
from md_studio import MDStudio

app = Starlette(
    routes=[
        Mount(
            "/md-studio",
            MDStudio(
                title="My Markdown Docs",
                scan_dirs=["./docs", "./markdowns", "./"],
                write_dir="./docs",
            )
        )
    ]
)
```

### Run the server

```bash
uvicorn main:app --reload
```

Then visit `http://localhost:8000/md-studio`

## Configuration

```python
MDStudio(
    scan_dirs=["./docs", "./markdowns", "./"],            # Where existing markdown files are scanned
    write_dir="./docs",              # Where new/imported markdown files are written
    storage_backend="filesystem",       # "filesystem" or "s3"
    title="MD Studio",
)
```

## Storage Backends

### Filesystem (Default)

```python
app.mount(
    "/docs",
    MDStudio(
        scan_dirs=["./content"],
        write_dir="./content",
        storage_backend="filesystem",
    )
)
```

### S3 Storage

```python
app.mount(
    "/docs",
    MDStudio(
        storage_backend="s3",
        s3_config={
            "bucket": "my-bucket",
            "region": "us-east-1",
            "access_key_id": "...",
            "secret_access_key": "...",
            "base_prefix": "docs/",
        }
    )
)
```


## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
