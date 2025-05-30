import os
from sqlalchemy.orm import Session
from database.session import SessionLocal
from database.models import FacialExpression

def populate_facial_expressions(folder_path: str):
    """
    Traverse the facial expressions folder structure and populate the FacialExpression table.
    Each character folder contains PNG files named after expressions (e.g., happy.png).
    """
    db: Session = SessionLocal()
    try:
        # Check if folder exists
        if not os.path.exists(folder_path):
            print(f"Folder '{folder_path}' not found. Please check the path.")
            return

        # Walk through the folder structure
        for character_name in os.listdir(folder_path):
            character_path = os.path.join(folder_path, character_name)
            if not os.path.isdir(character_path):
                print(f"Skipping '{character_path}' - not a directory.")
                continue

            # Process each PNG file in the character's folder
            for file in os.listdir(character_path):
                if file.lower().endswith('.png'):
                    file_path = os.path.join(character_path, file)
                    if not os.path.isfile(file_path):
                        print(f"Skipping '{file_path}' - not a file.")
                        continue

                    # Extract expression from filename (e.g., "happy" from "happy.png")
                    expression = os.path.splitext(file)[0]

                    # Check if entry already exists
                    existing_entry = db.query(FacialExpression).filter(
                        FacialExpression.name == character_name,
                        FacialExpression.facial_expression == expression
                    ).first()
                    if existing_entry:
                        print(f"Skipping '{file}' for character '{character_name}' - entry already exists.")
                        continue

                    # Read the PNG file as binary data
                    with open(file_path, "rb") as f:
                        image_data = f.read()

                    # Create a new FacialExpression record
                    facial_expression = FacialExpression(
                        name=character_name,
                        facial_expression=expression,
                        image=image_data
                    )

                    # Add to session
                    db.add(facial_expression)
                    print(f"Added facial expression '{expression}' for character '{character_name}'.")

            # Commit after processing each character folder
            db.commit()

    except Exception as e:
        print(f"Error processing folder '{folder_path}': {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Set the root directory to the facial expressions folder
    root_directory =  "C:/E backup/tutor app deploy/Facial Expression" # Adjust if your folder is elsewhere
    populate_facial_expressions(root_directory)