from database.session import SessionLocal
from database.models import Subject, Topic, Subtopic

def add_math_data():
    # Create a database session
    db = SessionLocal()
    try:
        # Check if the subject "General Math" exists
        subject_name = "General Math"
        existing_subject = db.query(Subject).filter(Subject.name == subject_name).first()
        if not existing_subject:
            # Create new subject
            subject = Subject(name=subject_name)
            db.add(subject)
            db.commit()
            db.refresh(subject)
            print(f"Inserted new subject: {subject_name}")
        else:
            subject = existing_subject
            print(f"Subject already exists: {subject_name}")

        # Check if the topic "Number Latex" exists for the subject
        topic_name = "Set Latex"
        existing_topic = db.query(Topic).filter(Topic.name == topic_name, Topic.subject_id == subject.id).first()
        if not existing_topic:
            # Create new topic
            topic = Topic(name=topic_name, subject_id=subject.id)
            db.add(topic)
            db.commit()
            db.refresh(topic)
            print(f"Inserted new topic: {topic_name}")
        else:
            topic = existing_topic
            print(f"Topic already exists: {topic_name}")

        # Check if the subtopic "Number Latex" exists for the topic
        subtopic_name = "Set Latex"
        existing_subtopic = db.query(Subtopic).filter(Subtopic.name == subtopic_name, Subtopic.topic_id == topic.id).first()
        if not existing_subtopic:
            # Create new subtopic
            subtopic = Subtopic(name=subtopic_name, topic_id=topic.id)
            db.add(subtopic)
            db.commit()
            db.refresh(subtopic)
            print(f"Inserted new subtopic: {subtopic_name}")
        else:
            print(f"Subtopic already exists: {subtopic_name}")

    except Exception as e:
        print(f"Error occurred: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_math_data()