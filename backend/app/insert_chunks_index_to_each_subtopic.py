import json
from database.session import SessionLocal
from database.models import Subtopic, Explain

json_file_name = "chunk.json"
subtopic_name = "Number"

def insert_chunk_to_subtopic():
    # Load chunks from JSON file
    try:
        with open(json_file_name, 'r') as f:
            chunks = json.load(f)
    except FileNotFoundError:
        print(json_file_name+" not found. Please place it in the working directory.")
        return
    except json.JSONDecodeError:
        print("Invalid JSON format in set_latex_image.json.")
        return

    # # Load index vectors from JSON file
    # try:
    #     with open('set_latex_index.json', 'r') as f:
    #         index_vectors = json.load(f)
    # except FileNotFoundError:
    #     print("set_latex_index.json not found. Please place it in the working directory.")
    #     return
    # except json.JSONDecodeError:
    #     print("Invalid JSON format in set_latex_index.json.")
    #     return

    db = SessionLocal()
    try:
        # Find the existing "Set Latex" subtopic
        subtopic = db.query(Subtopic).filter(Subtopic.name == subtopic_name).first()
        if not subtopic:
            print("Subtopic 'Set Latex' not found. Please create it first.")
            return

        # Check if an Explain entry already exists for this subtopic
        existing_explain = db.query(Explain).filter(Explain.subtopic_id == subtopic.id).first()
        if existing_explain:
            # Delete the existing Explain entry
            db.delete(existing_explain)
            db.commit()
            print(f"Deleted existing Explain entry for subtopic: {subtopic.name}")

        # Create new Explain entry
        explain = Explain(
            subtopic_id=subtopic.id,
            chunks=chunks,
            # index_faiss_embedding=index_vectors
        )
        db.add(explain)
        db.commit()
        db.refresh(explain)
        print(f"Inserted new Explain entry for subtopic: {subtopic.name}")

        # Verify the explains relationship
        subtopic = db.query(Subtopic).filter(Subtopic.name == subtopic_name).first()
        print(f"Subtopic: {subtopic.name}")
        print(f"Explains: {[e.chunks for e in subtopic.explains]}")
        if subtopic.explains:
            print(f"First Explain's Subtopic: {subtopic.explains[0].subtopic.name}")
            print(f"First Explain's Index (first 5 values of first vector): {subtopic.explains[0].index_faiss_embedding[0][:5] if subtopic.explains[0].index_faiss_embedding else None}")

    except Exception as e:
        print(f"Error occurred: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    insert_chunk_to_subtopic()