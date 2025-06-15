import os
import csv
import pandas as pd
from database.session import SessionLocal
from database.models import Subject, Topic, Subtopic, MCQ

def validate_correct_answer(correct_answer, row_num, file_path):
    """Validate that correct answer is a, b, c, or d (case insensitive)"""
    if not correct_answer:
        raise ValueError(f"❌ Error in {file_path}, row {row_num}: Correct answer is empty")
    
    correct_answer_clean = str(correct_answer).strip().lower()
    if correct_answer_clean not in ['a', 'b', 'c', 'd']:
        raise ValueError(f"❌ Error in {file_path}, row {row_num}: Correct answer '{correct_answer}' is not valid. Must be A, B, C, or D")
    
    return correct_answer_clean

def validate_csv_structure(df, file_path):
    """Validate CSV has minimum required columns based on position"""
    # Clean column names first
    df.columns = df.columns.str.strip()
    
    # We expect at least 9 columns based on your structure:
    # 0: Subtopic, 1: QuestionNumber, 2: Question, 3: Option A, 4: Option B, 
    # 5: Option C, 6: Option D, 7: CorrectAnswer, 8: Explanation, 9: Difficulty
    min_required_columns = 8  # At least up to CorrectAnswer column
    
    if len(df.columns) < min_required_columns:
        print(f"Available columns ({len(df.columns)}): {list(df.columns)}")
        raise ValueError(f"❌ Error in {file_path}: Expected at least {min_required_columns} columns, got {len(df.columns)}")
    
    # Rename columns to standard format for easier processing
    standard_names = ['subtopic', 'question_number', 'question', 'option_a', 'option_b', 
                     'option_c', 'option_d', 'correct_answer', 'explanation', 'difficulty']
    
    # Rename columns based on position (up to available columns)
    for i, std_name in enumerate(standard_names[:len(df.columns)]):
        df.columns.values[i] = std_name
    
    print(f"✅ Mapped columns: {list(df.columns)}")
    return df

def clean_text(text):
    """Clean text by removing extra whitespace"""
    if pd.isna(text):
        return ""
    return str(text).strip()

def process_csv_file(file_path, subject_name, topic_name, db):
    """Process a single CSV file and extract questions"""
    print(f"📄 Processing file: {file_path}")
    
    try:
        # Read CSV with proper encoding for Bengali text
        df = pd.read_csv(file_path, encoding='utf-8')
        
        # Validate CSV structure and clean column names
        df = validate_csv_structure(df, file_path)
        
        questions_data = []
        
        for idx, row in df.iterrows():
            row_num = idx + 2  # +2 because pandas is 0-indexed and CSV has header
            
            # Extract and clean data based on column positions (not names)
            subtopic_name = clean_text(row['subtopic'])
            question = clean_text(row['question'])
            option_a = clean_text(row['option_a'])
            option_b = clean_text(row['option_b']) 
            option_c = clean_text(row['option_c'])
            option_d = clean_text(row['option_d'])
            correct_answer = clean_text(row['correct_answer'])
            explanation = clean_text(row.get('explanation', ''))
            difficulty = row.get('difficulty', 5)
            
            # Skip empty rows
            if not subtopic_name or not question:
                continue
                
            # Validate correct answer
            correct_answer = validate_correct_answer(correct_answer, row_num, file_path)
            
            # Validate options are not empty
            if not all([option_a, option_b, option_c, option_d]):
                raise ValueError(f"❌ Error in {file_path}, row {row_num}: One or more options are empty")
            
            # Convert difficulty to integer, default to 5 if invalid
            try:
                hardness_level = int(difficulty) if pd.notna(difficulty) else 5
                if hardness_level < 1 or hardness_level > 10:
                    hardness_level = 5
            except (ValueError, TypeError):
                hardness_level = 5
            
            question_data = {
                'subtopic_name': subtopic_name,
                'question': question,
                'option_a': option_a,
                'option_b': option_b,
                'option_c': option_c,
                'option_d': option_d,
                'correct_option': correct_answer,
                'explanation': explanation,
                'hardness_level': hardness_level
            }
            
            questions_data.append(question_data)
            
        print(f"✅ Successfully processed {len(questions_data)} questions from {file_path}")
        return questions_data
        
    except Exception as e:
        print(f"❌ Error processing {file_path}: {str(e)}")
        raise

def insert_data_to_database(subject_name, topic_name, questions_data, db):
    """Insert processed data into database"""
    
    # Get or create subject
    subject = db.query(Subject).filter(Subject.name == subject_name).first()
    if not subject:
        # subject = Subject(name=subject_name)
        # db.add(subject)
        # db.commit()
        # db.refresh(subject)
        # print(f"✅ Created new subject: {subject_name}")
        print("\n\nSubject does not exist in database\n\n")
        return 
    else:
        print(f"📍 Using existing subject: {subject_name}")
    
    # Get or create topic
    topic = db.query(Topic).filter(Topic.name == topic_name, Topic.subject_id == subject.id).first()
    if not topic:
        # topic = Topic(name=topic_name, subject_id=subject.id)
        # db.add(topic)
        # db.commit()
        # db.refresh(topic)
        
        print(f"\n\n{topic_name} topic doesn't exist in database")
        return 
      
    else:
        print(f"📍 Using existing topic: {topic_name}")
    
    # Group questions by subtopic
    subtopics_dict = {}
    for question_data in questions_data:
        subtopic_name = question_data['subtopic_name']
        if subtopic_name not in subtopics_dict:
            subtopics_dict[subtopic_name] = []
        subtopics_dict[subtopic_name].append(question_data)
    
    # Process each subtopic
    for subtopic_name, questions in subtopics_dict.items():
        # Get or create subtopic
        subtopic = db.query(Subtopic).filter(
            Subtopic.name == subtopic_name, 
            Subtopic.topic_id == topic.id
        ).first()
        
        if not subtopic:
            # subtopic = Subtopic(name=subtopic_name, topic_id=topic.id)
            # db.add(subtopic)
            # db.commit()
            # db.refresh(subtopic)
            
            print(f"\n\n{subtopic_name} subtopic doesn't exist in database\n\n")
            continue
        else:
            print(f"📍 Using existing subtopic: {subtopic_name}")
        
        # Insert questions
        new_questions_count = 0
        for question_data in questions:
            # Check if question already exists
            existing_mcq = db.query(MCQ).filter(
                MCQ.question == question_data['question'],
                MCQ.subtopic_id == subtopic.id
            ).first()
            
            if not existing_mcq:
                mcq = MCQ(
                    question=question_data['question'],
                    option_a=question_data['option_a'],
                    option_b=question_data['option_b'],
                    option_c=question_data['option_c'],
                    option_d=question_data['option_d'],
                    correct_option=question_data['correct_option'],
                    explanation=question_data['explanation'],
                    hardness_level=question_data['hardness_level'],
                    subtopic_id=subtopic.id
                )
                db.add(mcq)
                new_questions_count += 1
            
        db.commit()
        print(f"✅ Inserted {new_questions_count} new questions into subtopic: {subtopic_name}")

def process_folders_and_files(base_directory="data"):
    """Main function to process all folders and CSV files"""
    db = SessionLocal()
    
    try:
        if not os.path.exists(base_directory):
            raise FileNotFoundError(f"❌ Base directory '{base_directory}' not found")
        
        total_files_processed = 0
        total_questions_inserted = 0
        
        # Iterate through subject folders
        for subject_folder in os.listdir(base_directory):
            subject_path = os.path.join(base_directory, subject_folder)
            
            # Skip if not a directory
            if not os.path.isdir(subject_path):
                continue
                
            subject_name = subject_folder
            print(f"\n🔍 Processing subject: {subject_name}")
            
            # Process CSV files in the subject folder
            for file_name in os.listdir(subject_path):
                if file_name.endswith('.csv'):
                    file_path = os.path.join(subject_path, file_name)
                    topic_name = os.path.splitext(file_name)[0]  # Remove .csv extension
                    
                    print(f"\n📂 Processing topic: {topic_name}")
                    
                    # Process the CSV file
                    questions_data = process_csv_file(file_path, subject_name, topic_name, db)
                    
                    # Insert data into database
                    insert_data_to_database(subject_name, topic_name, questions_data, db)
                    
                    total_files_processed += 1
                    total_questions_inserted += len(questions_data)
        
        print(f"\n🎉 SUMMARY:")
        print(f"✅ Total files processed: {total_files_processed}")
        print(f"✅ Total questions processed: {total_questions_inserted}")
        print(f"✅ Data insertion completed successfully!")
        
    except Exception as e:
        print(f"❌ Error occurred: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

def main():
    """Main execution function"""
    print("🚀 Starting CSV to Database insertion process...")
    print("📁 Expected folder structure: data/[subject_name]/[topic_name].csv")
    print("=" * 60)
    
    try:
        process_folders_and_files("C:\D backup\data")  # Change "data" to your base directory name
    except Exception as e:
        print(f"\n💥 FATAL ERROR: {str(e)}")
        print("🛑 Process stopped. Please fix the error and try again.")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    if success:
        print("\n🎊 All done! Your data has been successfully inserted into the database.")
    else:
        print("\n❌ Process failed. Check the errors above and try again.")