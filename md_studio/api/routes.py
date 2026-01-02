import io
import zipfile
import frontmatter
from starlette.routing import Route
from starlette.responses import JSONResponse, StreamingResponse
from starlette.requests import Request
from typing import Optional

from ..storage.content_adapter import ContentAdapter
from ..storage.image_storage import get_image_storage_adapter
from ..utils.schemas import CreateDocumentSchema, UpdateDocumentSchema
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
        
        if len(content) > 5 * 1024 * 1024:
            return JSONResponse({"error": "File must be 5MB or less"}, status_code=400)
        
        allowed_types = {
            "image/png": ".png",
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
            "image/webp": ".webp",
            "image/gif": ".gif",
        }
        
        if file.content_type not in allowed_types:
            return JSONResponse({"error": f"Unsupported file type: {file.content_type}"}, status_code=400)
        
        base_path = getattr(request.app.state, 'base_path', '')
        storage = get_image_storage_adapter(base_path=base_path)
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
        form = await request.form()
        adapter = await get_adapter(request)
        
        successful = []
        failed = []
        
        index = 0
        while True:
            file_content = form.get(f"file_{index}")
            if not file_content:
                break
            
            filename = form.get(f"filename_{index}", f"file_{index}.md")
            custom_slug = form.get(f"slug_{index}", "")
            replace = form.get(f"replace_{index}") == "true"
            
            try:
                post = frontmatter.loads(file_content)
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
    Route("/api/list", list_documents, methods=["GET"]),
    Route("/api/get", get_document, methods=["GET"]),
    Route("/api/create", create_document, methods=["POST"]),
    Route("/api/update", update_document, methods=["POST", "PUT", "PATCH"]),
    Route("/api/update/", update_document, methods=["POST", "PUT", "PATCH"]),
    Route("/api/delete", delete_document, methods=["POST", "DELETE"]),
    Route("/api/toggle-public", toggle_public, methods=["POST"]),
    Route("/api/upload", upload_file, methods=["POST"]),
    Route("/api/export", export_documents, methods=["GET"]),
    Route("/api/import", import_documents, methods=["POST"]),
]
