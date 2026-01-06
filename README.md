# MD Studio

A standalone Python package that provides a modern Markdown CMS for FastAPI and Starlette applications. 

## Features

- 📝 **Markdown-first**: Write content in Markdown with frontmatter support
- 🎨 **Modern UI**: React-based interface with dark mode
- 🚀 **Easy Integration**: Mount as an ASGI app in any FastAPI/Starlette app
- 📁 **Flexible Storage**: Filesystem storage for content and uploads
- 🔒 **Public Sharing**: Share documents publicly with unique URLs
- 📤 **Import/Export**: Bulk operations with ZIP archives
- 🖼️ **File Uploads**: Built-in file upload and attachment handling
- 🔍 **Search & Filter**: Full-text search with sorting and filtering

## Installation

```bash
pip install md-studio
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

Provide at least one of `scan_dirs` or `write_dir` (or set `MD_STUDIO_SCAN_DIRS`/`MD_STUDIO_WRITE_DIR`) so the content store can be located.
`scan_dirs` controls where existing content is scanned (list or comma-separated string).
`write_dir` selects where new/imported documents are saved.
`uploads_path` defaults to `<write_dir>/uploads` (or `<scan_dirs[0]>/uploads` if `write_dir` is unset).
`metadata_path` controls where the index metadata is stored (default: `<uploads_path>/.md-studio-metadata.json`).

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

## Frontend build (SPA)

The UI is a Remix SPA that is built with Node.js and then served by the Python package.
No Node runtime is needed in production, but Node is required to build the static assets.

```bash
cd ui
npm install
npm run build
```

The build output in `ui/build/client` should be copied to `md_studio/static`.
You can use the helper script:

```bash
bash ./build_and_run.sh
```

Note: Some dependencies require Node 20.19+, 22.12+, or 24+ to avoid EBADENGINE warnings.

## Configuration

```python
MDStudio(
    scan_dirs=["./docs", "./markdowns", "./"],            # Where existing markdown files are scanned
    write_dir="./docs",              # Where new/imported markdown files are written
    uploads_path="./docs/uploads",   # Optional override (defaults to write_dir/uploads)
    metadata_path="./docs/uploads/.md-studio-metadata.json",  # Optional override
    title="MD Studio",
)
```

### Environment Variables

- `MD_STUDIO_SCAN_DIRS`: Comma-separated scan roots (alternative to `scan_dirs`)
- `MD_STUDIO_CONTENT_DIRS`: Legacy alias for `MD_STUDIO_SCAN_DIRS`
- `MD_STUDIO_WRITE_DIR`: Write root for new/imported documents
- `MD_STUDIO_API_PATH`: API prefix injected into the frontend (default: `/md/api`)

For deployment to production environments, see [DEPLOYMENT.md](DEPLOYMENT.md).

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
