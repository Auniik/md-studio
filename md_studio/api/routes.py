import frontmatter
from starlette.routing import Route
from starlette.responses import JSONResponse
from starlette.requests import Request

from ..storage.content_adapter import ContentAdapter
from ..storage.image_storage import (
    ALLOWED_IMAGE_MIME_TYPES,
    MAX_IMAGE_FILE_SIZE,
    get_image_storage_adapter,
)
from .schemas import CreateDocumentSchema
from ..utils.slug import slugify, ensure_unique_slug

async def get_adapter(request: Request) -> ContentAdapter:
    return request.app.state.content_adapter

async def list_documents(request: Request):
    try:
        adapter = await get_adapter(request)
        query = request.query_params.get("q", "")
        page_param = request.query_params.get("page", "1")
        page_size_param = request.query_params.get("pageSize", "16")
        
        page = int(page_param) if page_param.isdigit() and int(page_param) > 0 else 1
        page_size = int(page_size_param) if page_size_param.isdigit() and int(page_size_param) > 0 else 16
        
        sort_by = request.query_params.get("sortBy", "date-newest")
        filter_by = request.query_params.get("filterBy", "all")
        
        result = await adapter.list(query, page, page_size, sort_by, filter_by)
        return JSONResponse({
            "docs": result["items"],
            "items": result["items"],
            "total": result["total"],
            "page": page
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

async def get_document(request: Request):
    try:
        adapter = await get_adapter(request)
        slug = request.query_params.get("slug")
        public_id = request.query_params.get("publicId")
        
        if not slug and not public_id:
            return JSONResponse({"success": False, "error": "slug or publicId is required"}, status_code=400)
        
        if slug:
            doc = await adapter.get_by_slug(slug)
        else:
            doc = await adapter.get_by_public_id(public_id)
        
        if not doc:
            return JSONResponse({"success": False, "error": "Document not found"}, status_code=404)
        
        return JSONResponse({"success": True, "doc": doc})
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

async def create_document(request: Request):
    try:
        form = await request.form()
        title = form.get("title")
        slug = form.get("slug", "")
        body_md = form.get("bodyMd")
        
        schema = CreateDocumentSchema(
            title=title,
            slug=slug if slug else None,
            bodyMd=body_md
        )
        
        adapter = await get_adapter(request)
        
        final_slug = await ensure_unique_slug(
            schema.slug,
            schema.title,
            lambda candidate: adapter._is_slug_available(candidate)
        )
        
        meta = await adapter.create({
            "title": schema.title,
            "slug": final_slug,
            "bodyMd": schema.bodyMd
        })
        
        return JSONResponse({"success": True, "slug": meta["slug"]})
    except ValueError as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=400)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

async def update_document(request: Request):
    try:
        form = await request.form()
        original_slug = form.get("originalSlug")
        
        if not original_slug:
            return JSONResponse({"success": False, "error": "Original slug is required"}, status_code=400)
        
        title = form.get("title")
        slug = form.get("slug", "")
        body_md = form.get("bodyMd")
        
        update_data = {}
        if title:
            update_data["title"] = title
        if slug:
            update_data["slug"] = slug
        if body_md is not None:
            update_data["bodyMd"] = body_md
        
        adapter = await get_adapter(request)
        updated = await adapter.update(original_slug, update_data)
        
        return JSONResponse({"success": True, "slug": updated["slug"]})
    except ValueError as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=400)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

async def delete_document(request: Request):
    try:
        form = await request.form()
        slug = form.get("slug")
        
        if not slug:
            return JSONResponse({"error": "Slug is required"}, status_code=400)
        
        adapter = await get_adapter(request)
        await adapter.remove(slug)
        
        return JSONResponse({"success": True})
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=404)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

async def toggle_public(request: Request):
    try:
        form = await request.form()
        slug = form.get("slug")
        
        if not slug:
            return JSONResponse({"error": "Slug is required"}, status_code=400)
        
        adapter = await get_adapter(request)
        meta = await adapter.toggle_public(slug)
        
        return JSONResponse({"success": True, "meta": meta})
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=404)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

async def upload_file(request: Request):
    try:
        form = await request.form()
        file = form.get("file")
        
        if not file:
            return JSONResponse({"error": "No file provided"}, status_code=400)
        
        content = await file.read()
        
        if len(content) > MAX_IMAGE_FILE_SIZE:
            return JSONResponse({"error": "File must be 5MB or less"}, status_code=400)

        if file.content_type not in ALLOWED_IMAGE_MIME_TYPES:
            return JSONResponse({"error": f"Unsupported file type: {file.content_type}"}, status_code=400)
        
        root_path = request.scope.get("root_path", "") or ""
        base_path = root_path.rstrip("/") if root_path not in ("", "/") else ""
        upload_dir = getattr(request.app.state, "uploads_path", None)
        storage = get_image_storage_adapter(base_path=base_path, upload_dir=upload_dir)
        result = await storage.upload_image(content, file.filename, file.content_type)
        
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

async def export_documents(request: Request):
    try:
        slug = request.query_params.get("slug")
        
        if not slug:
            return JSONResponse({"success": False, "error": "Slug is required"}, status_code=400)
        
        adapter = await get_adapter(request)
        result = await adapter.export_raw(slug)
        
        return JSONResponse({"success": True, **result})
    except ValueError as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=404)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

async def import_documents(request: Request):
    try:
        adapter = await get_adapter(request)

        if request.method == "GET":
            slug = request.query_params.get("slug")
            if not slug:
                return JSONResponse({"error": "Missing slug"}, status_code=400)
            existing = await adapter.get_by_slug(slug)
            return JSONResponse({"exists": bool(existing)})

        form = await request.form()
        successful = []
        failed = []
        
        index = 0
        while True:
            file_entry = form.get(f"file_{index}")
            if not file_entry:
                break
            
            filename = form.get(f"filename_{index}")
            if not filename and hasattr(file_entry, "filename"):
                filename = file_entry.filename
            filename = filename or f"file_{index}.md"
            custom_slug = form.get(f"slug_{index}", "")
            replace = form.get(f"replace_{index}") == "true"
            
            try:
                if hasattr(file_entry, "read"):
                    raw = await file_entry.read()
                    if isinstance(raw, bytes):
                        raw = raw.decode("utf-8", errors="replace")
                else:
                    raw = file_entry

                post = frontmatter.loads(raw)
                front_title = post.metadata.get("title")
                front_slug = post.metadata.get("slug")
                
                title = front_title or filename.replace(".md", "").replace("-", " ").replace("_", " ")
                slug = custom_slug or slugify(front_slug or title)
                
                existing = await adapter.get_by_slug(slug)
                
                if existing and not replace:
                    failed.append({"filename": filename, "error": f'Slug "{slug}" already exists'})
                    index += 1
                    continue
                
                if existing and replace:
                    await adapter.update(slug, {"title": title, "bodyMd": post.content})
                else:
                    await adapter.create({"title": title, "slug": slug, "bodyMd": post.content})
                
                successful.append({"slug": slug, "title": title})
            except Exception as e:
                failed.append({"filename": filename, "error": str(e)})
            
            index += 1
        
        if index == 0:
            return JSONResponse({"success": False, "error": "No files provided"}, status_code=400)
        
        return JSONResponse({"success": True, "successful": successful, "failed": failed})
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

routes = [
    Route("/md/api/list", list_documents, methods=["GET"]),
    Route("/md/api/get", get_document, methods=["GET"]),
    Route("/md/api/create", create_document, methods=["POST"]),
    Route("/md/api/update", update_document, methods=["POST", "PUT", "PATCH"]),
    Route("/md/api/delete", delete_document, methods=["POST", "DELETE"]),
    Route("/md/api/toggle-public", toggle_public, methods=["POST"]),
    Route("/md/api/upload", upload_file, methods=["POST"]),
    Route("/md/api/export", export_documents, methods=["GET"]),
    Route("/md/api/import", import_documents, methods=["GET", "POST"]),
]
