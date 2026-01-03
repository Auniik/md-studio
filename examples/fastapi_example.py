from fastapi import FastAPI
from md_studio import MDStudio

app = FastAPI()

app.mount(
    "/md-studio",
    MDStudio(
        scan_dirs=["./content",],
        write_dir="./content",
    )
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8123)
