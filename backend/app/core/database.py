from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

# 1. Create Synchronous SQLAlchemy Database Engine
# pool_pre_ping=True ensures stale/dropped connections are tested before executing queries
engine = create_engine(
    db_url,
    pool_pre_ping=True
)

# 2. Session Factory
# Each request will get its own separate database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Declarative Base
# All database models will inherit from this Base class to register with SQLAlchemy metadata
Base = declarative_base()


def get_db():
    """
    FastAPI Dependency that provides a database session to API route handlers.
    Yields the session for request handling and ensures it is safely closed afterwards.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
