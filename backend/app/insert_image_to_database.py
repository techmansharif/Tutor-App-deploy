from sqlalchemy.orm import Session
from database.models import Subtopic, Diagram
from database.session import SessionLocal
import os

def add_images_to_diagrams(db: Session, subtopic_name: str, image_folder: str = "images"):
    """
    Adds all PNG images from the specified folder to the diagrams table for a given subtopic.
    Skips adding an image if an entry with the same description and subtopic already exists.
    
    Args:
        db (Session): SQLAlchemy session for database operations.
        subtopic_name (str): Name of the subtopic to associate the images with.
        image_folder (str): Path to the folder containing the images (default: 'images').
    """
    # Step 1: Find the subtopic by name
    subtopic = db.query(Subtopic).filter(Subtopic.name == subtopic_name).first()
    if not subtopic:
        raise ValueError(f"Subtopic '{subtopic_name}' not found in the database.")

    # Step 2: Check if the image folder exists
    if not os.path.exists(image_folder):
        raise FileNotFoundError(f"Image folder '{image_folder}' not found.")

    # Step 3: Iterate over all files in the image folder
    for image_filename in os.listdir(image_folder):
        # Process only PNG files
        if not image_filename.lower().endswith('.png'):
            continue

        # Construct the full image path
        image_path = os.path.join(image_folder, image_filename)
        
        if not os.path.isfile(image_path):
            print(f"Skipping '{image_path}' - not a file.")
            continue

        # Step 4: Extract description from filename (remove extension)
        description = os.path.splitext(image_filename)[0]  # e.g., "Intersections of sets"

        # Step 5: Check if a Diagram entry with this description and subtopic_id already exists
        existing_diagram = db.query(Diagram).filter(
            Diagram.subtopic_id == subtopic.id,
            Diagram.description == description
        ).first()

        if existing_diagram:
            print(f"Skipping image '{image_filename}' - a diagram with description '{description}' already exists for subtopic '{subtopic_name}'.")
            continue

        # Step 6: Read the image as binary data
        with open(image_path, "rb") as f:
            image_content = f.read()

        # Step 7: Create a new Diagram entry
        new_diagram = Diagram(
            subtopic_id=subtopic.id,
            description=description,
            image_content=image_content
        )

        # Step 8: Add to database
        db.add(new_diagram)
        print(f"Added image '{image_filename}' to subtopic '{subtopic_name}' with description '{description}'.")

    # Step 9: Commit all changes after processing all images
    db.commit()
    print(f"Finished adding images to subtopic '{subtopic_name}'.")

# Example usage:
db = SessionLocal()
try:
    add_images_to_diagrams(db, subtopic_name="Set Latex")
finally:
    db.close()