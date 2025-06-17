import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DB_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:password@mariadb:3306/bismillahta")

engine = create_engine(DB_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()