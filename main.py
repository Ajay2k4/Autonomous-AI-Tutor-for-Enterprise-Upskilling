from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from api.routes import router
from database import engine, Base
from contextlib import asynccontextmanager
from utils.logger import logger
import time

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Database...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized successfully.")
    yield
    logger.info("Shutting down AI Tutor API...")

app = FastAPI(
    title="Autonomous AI Tutor API",
    lifespan=lifespan
)

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "*", # Temporary for development if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DIAGNOSTIC MIDDLEWARE
@app.middleware("http")
async def log_requests(request: Request, call_next):
    auth_header = request.headers.get("Authorization")
    logger.info(f"Incoming Request: {request.method} {request.url.path}")
    if auth_header:
        logger.info(f"Auth Header Found: {auth_header[:20]}...")
    else:
        logger.warning(f"No Auth Header found for {request.url.path}")
    
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"Response: {response.status_code} (Time: {process_time:.4f}s)")
    return response

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body}
    )
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
