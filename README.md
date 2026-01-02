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
from md_studio import MarkdownStudioMiddleware

app = FastAPI()

app.mount(
    "/docs",
    MarkdownStudioMiddleware(
        storage_path="./content",
        title="My Documentation",
        allow_upload=True,
    )
)
```

### Starlette

```python
from starlette.applications import Starlette
from starlette.routing import Mount
from md_studio import MarkdownStudioMiddleware

app = Starlette(
    routes=[
        Mount(
            "/docs",
            MarkdownStudioMiddleware(
                storage_path="./content",
                uploads_path="./uploads",
                title="My Docs",
            )
        )
    ]
)
```

### Run the server

```bash
uvicorn main:app --reload
```

Then visit `http://localhost:8000/docs`

## Configuration

```python
MarkdownStudioMiddleware(
    storage_path="./content",           # Where markdown files are stored
    uploads_path="./uploads",           # Where uploaded files are stored
    storage_backend="filesystem",       # "filesystem" or "s3"
    title="MD Studio",                  # Application title
    allow_upload=True,                  # Enable file uploads
    allow_import_export=True,           # Enable import/export
    max_upload_size=10485760,           # Max upload size (10MB)
    s3_config=None,                     # S3 configuration dict
)
```

## Storage Backends

### Filesystem (Default)

```python
app.mount(
    "/docs",
    MarkdownStudioMiddleware(
        storage_path="./content",
        storage_backend="filesystem",
    )
)
```

### S3 Storage

```python
app.mount(
    "/docs",
    MarkdownStudioMiddleware(
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

## Development

### Frontend Development

The frontend is built with Remix and React. To rebuild the frontend:

```bash
cd md-cms-file
npm install
npm run build
```

Then copy the built assets:

```bash
cp -r md-cms-file/build/client/* md-studio/md_studio/static/
```

### Running Tests

```bash
pip install -e ".[dev]"
pytest
```

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
