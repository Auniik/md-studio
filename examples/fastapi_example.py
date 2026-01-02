from fastapi import FastAPI
from md_studio import MarkdownStudioMiddleware

app = FastAPI()

app.mount(
    "/md",
    MarkdownStudioMiddleware(
        storage_path="./content",
        uploads_path="./uploads",
        title="My Documentation",
        allow_upload=True,
        allow_import_export=True,
        base_path="/md",
    )
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8123)
