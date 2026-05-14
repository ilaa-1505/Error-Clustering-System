from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from dotenv import load_dotenv
from app.routers import clustering

load_dotenv()

app = FastAPI(title="Error Clustering Engine")

# API routes
app.include_router(clustering.router, prefix="/api/cluster")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# React static files
app.mount(
    "/static",
    StaticFiles(directory="frontend/build/static"),
    name="static",
)

# Serve React frontend
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    if full_path.startswith("api"):
        return {"detail": "API route not found"}

    return FileResponse("frontend/build/index.html")