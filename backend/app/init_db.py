# init_db.py
from database.session import engine, Base  # Import engine and Base from your app
from database.models import Subject, Topic, Subtopic, MCQ, Quiz0,QuizAnswer,Explain# Import all models

def create_tables():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)  # This will create all tables based on your models
    print("✅ Tables created!")

if __name__ == "__main__":
    create_tables()