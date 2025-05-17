import re
import json
import os
from sqlalchemy.orm import Session
from database.session import SessionLocal
from database.models import Subject, Topic, Subtopic, Explain, Diagram

def extract_latex_parts(latex_content):
    """
    Extract content between \part commands, excluding the \part command itself.
    Returns a list of tuples: (part_title, part_content).
    """
    part_pattern = r'\\part\*?\{([^}]*)\}'
    part_matches = list(re.finditer(part_pattern, latex_content))
    parts = []
    for i in range(len(part_matches)):
        part_title = part_matches[i].group(1).strip()
        start_pos = part_matches[i].end()
        if i < len(part_matches) - 1:
            end_pos = part_matches[i + 1].start()
        else:
            end_pos = len(latex_content)
        part_content = latex_content[start_pos:end_pos].strip()
        parts.append((part_title, part_content))
    return parts

def extract_latex_chunks(latex_content):
    """
    Extract sections and subsections from LaTeX content as chunks.
    """
    section_pattern = r'\\(?:sub)*section\*?{[^}]*}'
    textbf_pattern = r'\\textbf{[^}]*}'
    combined_pattern = f'({section_pattern})|({textbf_pattern})'
    section_matches = list(re.finditer(combined_pattern, latex_content))
    chunks = []
    for i in range(len(section_matches)):
        start_pos = section_matches[i].start()
        if i < len(section_matches) - 1:
            end_pos = section_matches[i + 1].start()
        else:
            end_pos = len(latex_content)
        chunk = latex_content[start_pos:end_pos].strip()
        chunks.append(chunk)
    return chunks

def add_images_to_diagrams(db: Session, subtopic: Subtopic, image_folder: str):
    """
    Adds PNG images from the specified folder to the diagrams table for a given subtopic.
    Skips if the folder doesn't exist or is empty, or if a diagram already exists.
    """
    # Check if image folder exists and contains PNG files
    if not os.path.exists(image_folder):
        print(f"Image folder '{image_folder}' not found for subtopic '{subtopic.name}'. Skipping image processing.")
        return
    png_files = [f for f in os.listdir(image_folder) if f.lower().endswith('.png')]
    if not png_files:
        print(f"No PNG images found in '{image_folder}' for subtopic '{subtopic.name}'. Skipping image processing.")
        return

    # Process each PNG image
    for image_filename in png_files:
        image_path = os.path.join(image_folder, image_filename)
        if not os.path.isfile(image_path):
            print(f"Skipping '{image_path}' - not a file.")
            continue
        description = os.path.splitext(image_filename)[0]
        existing_diagram = db.query(Diagram).filter(
            Diagram.subtopic_id == subtopic.id,
            Diagram.description == description
        ).first()
        if existing_diagram:
            print(f"Skipping image '{image_filename}' - diagram with description '{description}' already exists.")
            continue
        with open(image_path, "rb") as f:
            image_content = f.read()
        new_diagram = Diagram(
            subtopic_id=subtopic.id,
            description=description,
            image_content=image_content
        )
        db.add(new_diagram)
        print(f"Added image '{image_filename}' to subtopic '{subtopic.name}' with description '{description}'.")
    db.commit()

def process_latex_file(latex_file_path: str, image_folder: str, subject_name: str, topic_name: str):
    """
    Process a single LaTeX file, extract chunks, and store in database.
    Also process images if the image folder exists and contains PNGs.
    """
    db = SessionLocal()
    try:
        # Find or create subject
        subject = db.query(Subject).filter(Subject.name == subject_name).first()
        if not subject:
            subject = Subject(name=subject_name)
            db.add(subject)
            db.commit()
            db.refresh(subject)
            print(f"Created new subject: {subject_name}")

        # Find or create topic
        topic = db.query(Topic).filter(
            Topic.name == topic_name,
            Topic.subject_id == subject.id
        ).first()
        if not topic:
            topic = Topic(name=topic_name, subject_id=subject.id)
            db.add(topic)
            db.commit()
            db.refresh(topic)
            print(f"Created new topic: {topic_name} under subject: {subject_name}")

        # Read LaTeX file
        # Read LaTeX file with UTF-8 encoding
        with open(latex_file_path, 'r', encoding='utf-8') as file:
            latex_document = file.read()

        # Clean LaTeX document
        latex_document_cleaned = re.sub(r'\\documentclass.*?\\begin\{document\}', '', latex_document, flags=re.DOTALL)
        latex_document_cleaned = re.sub(r'\\title\{.*?\}', '', latex_document_cleaned, flags=re.DOTALL)
        latex_document_cleaned = re.sub(r'\\author\{.*?\}', '', latex_document_cleaned, flags=re.DOTALL)
        latex_document_cleaned = re.sub(r'\\date\{.*?\}', '', latex_document_cleaned, flags=re.DOTALL)
        latex_document_cleaned = re.sub(r'\\maketitle', '', latex_document_cleaned, flags=re.DOTALL)
        latex_document_cleaned = re.sub(r'\\end\{document\}', '', latex_document_cleaned, flags=re.DOTALL)

        # Extract parts
        parts = extract_latex_parts(latex_document_cleaned)
        if not parts:
            print(f"No \\part{{}} found in {latex_file_path}. Skipping.")
            return

        for part_title, part_content in parts:
            subtopic_name = part_title.strip()
            if not subtopic_name:
                print(f"Empty part title in {latex_file_path}. Skipping this part.")
                continue

            # Find or create subtopic
            subtopic = db.query(Subtopic).filter(
                Subtopic.name == subtopic_name,
                Subtopic.topic_id == topic.id
            ).first()
            if not subtopic:
                subtopic = Subtopic(name=subtopic_name, topic_id=topic.id)
                db.add(subtopic)
                db.commit()
                db.refresh(subtopic)
                print(f"Created new subtopic: {subtopic_name} under topic: {topic_name}")

            # Extract chunks
            chunks = extract_latex_chunks(part_content)
            if not chunks:
                print(f"No chunks extracted for subtopic '{subtopic_name}' in {latex_file_path}. Skipping.")
                continue

            # Delete existing Explain entry if it exists
            existing_explain = db.query(Explain).filter(Explain.subtopic_id == subtopic.id).first()
            if existing_explain:
                db.delete(existing_explain)
                db.commit()
                print(f"Deleted existing Explain entry for subtopic: {subtopic_name}")

            # Create new Explain entry
            explain = Explain(
                subtopic_id=subtopic.id,
                chunks=chunks
            )
            db.add(explain)
            db.commit()
            db.refresh(explain)
            print(f"Inserted new Explain entry for subtopic: {subtopic_name}")

            # Process images
            add_images_to_diagrams(db, subtopic, image_folder)

    except Exception as e:
        print(f"Error processing {latex_file_path}: {str(e)}")
        db.rollback()
    finally:
        db.close()

def process_folder_structure(root_dir: str):
    """
    Traverse the AI Tutor folder structure and process all LaTeX files.
    """
    for subject_name in os.listdir(root_dir):
        subject_path = os.path.join(root_dir, subject_name)
        if not os.path.isdir(subject_path):
            continue
        for topic_name in os.listdir(subject_path):
            topic_path = os.path.join(subject_path, topic_name)
            if not os.path.isdir(topic_path):
                continue
            # Look for LaTeX file (assuming .tex or .txt extension)
            for file in os.listdir(topic_path):
                if file.lower().endswith(('.tex', '.txt')):
                    latex_file_path = os.path.join(topic_path, file)
                    # Assume Images folder is in the same topic directory
                    image_folder = os.path.join(topic_path, 'Images')
                    print(f"Processing LaTeX file: {latex_file_path}")
                    process_latex_file(latex_file_path, image_folder, subject_name, topic_name)

if __name__ == "__main__":
    # Set the root directory to the AI Tutor folder
    root_directory = "C:\D backup\Tutor data"  # Adjust if your folder is elsewhere
    if not os.path.exists(root_directory):
        print(f"Root directory '{root_directory}' not found. Please check the path.")
    else:
        process_folder_structure(root_directory)