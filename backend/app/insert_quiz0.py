from database.session import SessionLocal
from database.models import Quiz0  # Import the Quiz0 model

import os
print("Current working directory:", os.getcwd())

# Function to insert fun MCQs into the database (for quiz0s table)
def insert_fun_mcqs(db):
    # Define a list of fun questions for Math and English
    fun_questions = [
        {"question": "What is 2 + 2?", "option_a": "3", "option_b": "4", "option_c": "5", "option_d": "6", "correct_option": "b", "explanation": "2 + 2 equals 4.", "category": "Math"},
        {"question": "Name the capital of France.", "option_a": "London", "option_b": "Berlin", "option_c": "Paris", "option_d": "Madrid", "correct_option": "c", "explanation": "Paris is the capital city of France.", "category": "English"},
        {"question": "What is 3 squared?", "option_a": "6", "option_b": "9", "option_c": "12", "option_d": "15", "correct_option": "b", "explanation": "3 x 3 = 9.", "category": "Math"},
        {"question": "What is the synonym of 'happy'?", "option_a": "Sad", "option_b": "Angry", "option_c": "Joyful", "option_d": "Bored", "correct_option": "c", "explanation": "Synonym of happy is 'joyful'.", "category": "English"},
        {"question": "Which word is the opposite of 'noisy'?","option_a": "Quiet","option_b": "Loud","option_c": "Crazy", "option_d": "Happy","correct_option": "a","explanation": "The opposite of 'noisy' is 'quiet', which means making little or no sound.","category": "English"}

    ]

    for fun_q in fun_questions:
        # Check if the fun question with its options and correct answer already exists in the database
        existing_fun_q = db.query(Quiz0).filter(
            Quiz0.question == fun_q["question"],
            Quiz0.option_a == fun_q["option_a"],
            Quiz0.option_b == fun_q["option_b"],
            Quiz0.option_c == fun_q["option_c"],
            Quiz0.option_d == fun_q["option_d"],
            Quiz0.correct_option == fun_q["correct_option"]
        ).first()

        if not existing_fun_q:
            # Insert if the question does not already exist
            fun_question = Quiz0(
                question=fun_q["question"],
                option_a=fun_q["option_a"],
                option_b=fun_q["option_b"],
                option_c=fun_q["option_c"],
                option_d=fun_q["option_d"],
                correct_option=fun_q["correct_option"],
                explanation=fun_q["explanation"],
                category=fun_q["category"]
            )
            db.add(fun_question)
            db.commit()
            db.refresh(fun_question)
            print(f"Inserted new fun MCQ: {fun_q['question']}")
        else:
            print(f"Fun MCQ already exists: {fun_q['question']}")

# Main function to execute data insertion
def main():
    db = SessionLocal()  # Get database session
    try:
        insert_fun_mcqs(db)  # Insert fun MCQs into the quiz0s table
        print("✅ Fun MCQs inserted successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    main()
