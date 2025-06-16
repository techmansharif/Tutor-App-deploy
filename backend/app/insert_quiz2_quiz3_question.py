import json
from database.session import SessionLocal
from database.models import Subject, Topic, Subtopic, MCQ  # Import models

import os
print("Current working directory:", os.getcwd())

# Function to read data from the JSON file
def read_data_from_json():
    # Add encoding='utf-8' to handle Unicode characters (Bengali text)
    with open("C:/E backup/tutor app deploy\Tutor-App/backend/app/question_bank.json", "r", encoding='utf-8') as file:
        return json.load(file)

# Function to insert data into the database
def insert_data(db, data):
    for subject_info in data["subjects"]:
        # Check if the subject already exists in the database
        existing_subject = db.query(Subject).filter(Subject.name == subject_info["name"]).first()
        if not existing_subject:
            # Insert subject if it does not exist
            subject = Subject(name=subject_info["name"])
            db.add(subject)
            db.commit()
            db.refresh(subject)
            print(f"Inserted new subject: {subject_info['name']}")
        else:
            # If subject exists, use the existing one
            subject = existing_subject
            print(f"Subject already exists: {subject_info['name']}")

        for topic_info in subject_info["topics"]:
            # Check if the topic already exists for the current subject
            existing_topic = db.query(Topic).filter(Topic.name == topic_info["name"], Topic.subject_id == subject.id).first()
            if not existing_topic:
                # Insert topic if it does not exist
                topic = Topic(name=topic_info["name"], subject_id=subject.id)
                db.add(topic)
                db.commit()
                db.refresh(topic)
                print(f"Inserted new topic: {topic_info['name']}")
            else:
                # If topic exists, use the existing one
                topic = existing_topic
                print(f"Topic already exists: {topic_info['name']}")

            for subtopic_info in topic_info["subtopics"]:
                # Check if the subtopic already exists for the current topic
                existing_subtopic = db.query(Subtopic).filter(Subtopic.name == subtopic_info["name"], Subtopic.topic_id == topic.id).first()
                if not existing_subtopic:
                    # Insert subtopic if it does not exist
                    subtopic = Subtopic(name=subtopic_info["name"], topic_id=topic.id)
                    db.add(subtopic)
                    db.commit()
                    db.refresh(subtopic)
                    print(f"Inserted new subtopic: {subtopic_info['name']}")
                else:
                    # If subtopic exists, use the existing one
                    subtopic = existing_subtopic
                    print(f"Subtopic already exists: {subtopic_info['name']}")

                # Insert questions (MCQs) and prevent duplicates
                for mcq in subtopic_info["questions"]:
                    # Check if the MCQ already exists in the database
                    existing_mcq = db.query(MCQ).filter(
                        MCQ.question == mcq["question"],
                        MCQ.subtopic_id == subtopic.id  # Also check subtopic to avoid cross-subtopic duplicates
                    ).first()

                    if not existing_mcq:
                        # Insert the MCQ if it does not exist
                        mcq_data = {
                            "question": mcq["question"],
                            "option_a": mcq["option_a"],
                            "option_b": mcq["option_b"],
                            "option_c": mcq["option_c"],
                            "option_d": mcq["option_d"],
                            "correct_option": mcq["correct_option"],
                            "explanation": mcq.get("explanation", ""),  # Use .get() for safer access
                            "hardness_level": mcq.get("hardness_level", 5),  # Default to 5 if not provided
                            "subtopic_id": subtopic.id
                        }
                        db.add(MCQ(**mcq_data))
                        db.commit()
                        print(f"Inserted new MCQ: {mcq['question'][:50]}...")  # Truncate long questions in log
                    else:
                        print(f"MCQ already exists: {mcq['question'][:50]}...")

# Main function to execute data insertion
def main():
    db = SessionLocal()  # Get database session
    try:
        print("Reading data from JSON file...")
        data = read_data_from_json()  # Read data from the JSON file
        print(f"Found {len(data['subjects'])} subjects in JSON")
        
        print("Starting data insertion...")
        insert_data(db, data)  # Insert data into the database
        print("✅ Data inserted successfully!")
        
    except FileNotFoundError:
        print("❌ Error: question_bank.json file not found. Make sure the file exists in the app/ directory.")
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON format - {e}")
    except Exception as e:
        print(f"❌ Error occurred: {e}")
        db.rollback()  # Rollback any pending transaction
    finally:
        db.close()

if __name__ == "__main__":
    main()