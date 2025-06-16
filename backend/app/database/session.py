from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


DATABASE_URL = os.getenv("DATABASE_URL")  # For production (Cloud Run)

# Fallback for local development
if DATABASE_URL is None:
    logger.error("DATABASE_URL environment variable is not set")
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
    DATABASE_URL = os.getenv("DATABASE_URL")
    print(DATABASE_URL)
logger.info(f"Connecting to database with URL: {DATABASE_URL[:20]}...")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
