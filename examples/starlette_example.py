from starlette.applications import Starlette
from starlette.routing import Mount
from md_studio import MDStudio
import uvicorn

app = Starlette(
    routes=[
        Mount(
            "/",
            MDStudio(
                scan_dirs=["./content"],
                write_dir="./content",
                uploads_path="./uploads",
                title="MD Studio",
            )
        )
    ]
)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
