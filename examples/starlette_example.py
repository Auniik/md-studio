from starlette.applications import Starlette
from starlette.routing import Mount
from md_studio import MDStudio
import uvicorn

app = Starlette(
    routes=[
        Mount(
            "/",
            MDStudio(
                scan_dirs=["./docs"],
                write_dir="./docs",
                title="MD Studio",
            )
        )
    ]
)

if __name__ == "__main__":
    uvicorn.run(app, port=8123)
