"""SQLAlchemy engine + session for Nirdesh.

SQLite for the prototype (zero setup, resettable on stage). The ORM layer means
production can move to Postgres + pgvector by changing only the URL.
"""

from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import DATA_DIR

DB_PATH = DATA_DIR / "nirdesh.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# check_same_thread=False so FastAPI's threadpool can share the connection.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    from . import models  # noqa: F401  (register mappers)

    Base.metadata.create_all(bind=engine)


def get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
