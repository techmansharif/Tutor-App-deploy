import re
import os
from sqlalchemy.orm import Session
from database.session import SessionLocal
from database.models import Subject, Topic, Subtopic, Diagram

def parse_latex_structure(latex_content):
    """
    Parse LaTeX file to create a mapping of content positions to parts.
    Returns: dict mapping content descriptions to their parent part names.
    """
    # Clean the LaTeX content first
    cleaned_content = clean_latex_content(latex_content)
    
    # Find all parts with their positions
    part_pattern = r'\\part\*?\{([^}]*)\}'
    part_matches = list(re.finditer(part_pattern, cleaned_content))
    
    if not part_matches:
        print("❌ No \\part{} found in LaTeX file")
        return {}
    
    # Find all sections, subsections, and textbf with their positions
    section_patterns = [
        (r'\\section\*?\{([^}]*)\}', 'section'),
        (r'\\subsection\*?\{([^}]*)\}', 'subsection'), 
        (r'\\subsubsection\*?\{([^}]*)\}', 'subsubsection'),
        (r'\\textbf\{([^}]*)\}', 'textbf')
    ]
    
    # Collect all content items with their positions
    content_items = []
    for pattern, item_type in section_patterns:
        for match in re.finditer(pattern, cleaned_content):
            content_items.append({
                'type': item_type,
                'title': match.group(1).strip(),
                'position': match.start(),
                'match': match
            })
    
    # Sort content items by position
    content_items.sort(key=lambda x: x['position'])
    
    # Create mapping from content titles to part names
    content_to_part = {}
    
    for content_item in content_items:
        content_position = content_item['position']
        content_title = content_item['title']
        
        # Find which part this content belongs to
        parent_part = None
        for i, part_match in enumerate(part_matches):
            part_start = part_match.end()  # After the \part{} declaration
            
            # Determine part end position
            if i < len(part_matches) - 1:
                part_end = part_matches[i + 1].start()
            else:
                part_end = len(cleaned_content)
            
            # Check if content is within this part
            if part_start <= content_position < part_end:
                parent_part = part_match.group(1).strip()
                break
        
        if parent_part:
            content_to_part[content_title] = parent_part
            print(f"📍 Found: '{content_title}' → Part: '{parent_part}'")
    
    return content_to_part

def clean_latex_content(latex_content):
    """
    Clean LaTeX content by removing document structure commands.
    """
    # Remove document class and preamble
    cleaned = re.sub(r'\\documentclass.*?\\begin\{document\}', '', latex_content, flags=re.DOTALL)
    cleaned = re.sub(r'\\title\{.*?\}', '', cleaned, flags=re.DOTALL)
    cleaned = re.sub(r'\\author\{.*?\}', '', cleaned, flags=re.DOTALL)
    cleaned = re.sub(r'\\date\{.*?\}', '', cleaned, flags=re.DOTALL)
    cleaned = re.sub(r'\\maketitle', '', cleaned, flags=re.DOTALL)
    cleaned = re.sub(r'\\end\{document\}', '', cleaned, flags=re.DOTALL)
    
    return cleaned.strip()

def find_image_subtopic(image_description, content_to_part_mapping):
    """
    Find which subtopic an image belongs to based on its description.
    
    Args:
        image_description (str): The image filename without extension
        content_to_part_mapping (dict): Mapping from content titles to part names
    
    Returns:
        str or None: The subtopic name (part name) or None if not found
    """
    # Direct exact match
    if image_description in content_to_part_mapping:
        return content_to_part_mapping[image_description]
    
    # Case-insensitive exact match
    for content_title, part_name in content_to_part_mapping.items():
        if content_title.lower() == image_description.lower():
            return part_name
    
    # Partial matching - check if image description is contained in any content title
    for content_title, part_name in content_to_part_mapping.items():
        if image_description.lower() in content_title.lower():
            print(f"🔍 Partial match: '{image_description}' found in '{content_title}'")
            return part_name
    
    # Reverse partial matching - check if content title is contained in image description
    for content_title, part_name in content_to_part_mapping.items():
        if content_title.lower() in image_description.lower():
            print(f"🔍 Reverse partial match: '{content_title}' found in '{image_description}'")
            return part_name
    
    return None

def process_images_with_latex_parsing(subject_name, topic_name, root_dir):
    """
    Process images by parsing LaTeX file structure to determine subtopics automatically.
    
    Args:
        subject_name (str): Name of the subject
        topic_name (str): Name of the topic
        root_dir (str): Root directory containing all subjects
    """
    topic_path = os.path.join(root_dir, subject_name, topic_name)
    
    if not os.path.exists(topic_path):
        print(f"❌ Topic path not found: {topic_path}")
        return
    
    # Find LaTeX file
    latex_file = None
    for file in os.listdir(topic_path):
        if file.lower().endswith(('.tex', '.txt')):
            latex_file = os.path.join(topic_path, file)
            break
    
    if not latex_file:
        print(f"❌ No LaTeX file found in: {topic_path}")
        return
    
    # Find Images folder
    images_folder = None
    for folder_name in ['Images', 'images', 'IMAGES']:
        potential_path = os.path.join(topic_path, folder_name)
        if os.path.exists(potential_path) and os.path.isdir(potential_path):
            images_folder = potential_path
            break
    
    if not images_folder:
        print(f"❌ No Images folder found in: {topic_path}")
        return
    
    print(f"🚀 Processing: {subject_name}/{topic_name}")
    print(f"📄 LaTeX file: {latex_file}")
    print(f"📁 Images folder: {images_folder}")
    
    # Read and parse LaTeX file
    try:
        with open(latex_file, 'r', encoding='utf-8') as f:
            latex_content = f.read()
    except Exception as e:
        print(f"❌ Error reading LaTeX file: {e}")
        return
    
    # Parse LaTeX structure
    print(f"\n📖 Parsing LaTeX structure...")
    content_to_part_mapping = parse_latex_structure(latex_content)
    
    if not content_to_part_mapping:
        print(f"❌ No content-to-part mapping found")
        return
    
    print(f"✅ Found {len(content_to_part_mapping)} content items")
    
    # Get PNG files
    png_files = [f for f in os.listdir(images_folder) if f.lower().endswith('.png')]
    
    if not png_files:
        print(f"⚠️  No PNG files found in Images folder")
        return
    
    print(f"\n🖼️  Processing {len(png_files)} images...")
    
    # Database operations
    db = SessionLocal()
    try:
        images_processed = 0
        images_added = 0
        
        for png_file in png_files:
            print(f"\n--- Processing: {png_file} ---")
            
            # Extract description from filename
            image_description = os.path.splitext(png_file)[0]
            print(f"🔍 Looking for: '{image_description}'")
            
            # Find which subtopic this image belongs to
            subtopic_name = find_image_subtopic(image_description, content_to_part_mapping)
            
            if not subtopic_name:
                print(f"❌ Could not find subtopic for '{image_description}'")
                print(f"   Available content titles: {list(content_to_part_mapping.keys())}")
                continue
            
            print(f"✅ Mapped to subtopic: '{subtopic_name}'")
            
            # Find subtopic in database
            subtopic = db.query(Subtopic).join(Topic).join(Subject).filter(
                Subject.name == subject_name,
                Topic.name == topic_name,
                Subtopic.name == subtopic_name
            ).first()
            
            if not subtopic:
                print(f"❌ Subtopic '{subtopic_name}' not found in database")
                continue
            
            # Check if diagram already exists
            existing_diagram = db.query(Diagram).filter(
                Diagram.subtopic_id == subtopic.id,
                Diagram.description == image_description
            ).first()
            
            if existing_diagram:
                print(f"⚠️  Image already exists in database")
                images_processed += 1
                continue
            
            # Read and add image
            try:
                image_path = os.path.join(images_folder, png_file)
                with open(image_path, "rb") as f:
                    image_content = f.read()
                
                new_diagram = Diagram(
                    subtopic_id=subtopic.id,
                    description=image_description,
                    image_content=image_content
                )
                
                db.add(new_diagram)
                images_added += 1
                images_processed += 1
                print(f"✅ Added to database")
                
            except Exception as e:
                print(f"❌ Error adding image: {e}")
        
        # Commit all changes
        if images_added > 0:
            db.commit()
            print(f"\n🎉 Successfully processed {images_processed} images")
            print(f"✅ Added {images_added} new images to database")
        else:
            print(f"\nℹ️  No new images added ({images_processed} already existed)")
    
    except Exception as e:
        print(f"❌ Database error: {e}")
        db.rollback()
    finally:
        db.close()

def process_all_topics_with_smart_parsing(root_dir):
    """
    Process all topics in the hierarchy using smart LaTeX parsing.
    """
    if not os.path.exists(root_dir):
        print(f"❌ Root directory not found: {root_dir}")
        return
    
    print(f"🌟 Starting smart image processing from: {root_dir}")
    
    for subject_name in os.listdir(root_dir):
        subject_path = os.path.join(root_dir, subject_name)
        if not os.path.isdir(subject_path):
            continue
        
        print(f"\n📚 Processing Subject: {subject_name}")
        
        for topic_name in os.listdir(subject_path):
            topic_path = os.path.join(subject_path, topic_name)
            if not os.path.isdir(topic_path):
                continue
            
            print(f"\n📖 Processing Topic: {topic_name}")
            process_images_with_latex_parsing(subject_name, topic_name, root_dir)

def debug_latex_structure(subject_name, topic_name, root_dir):
    """
    Debug function to see the LaTeX structure without processing images.
    """
    topic_path = os.path.join(root_dir, subject_name, topic_name)
    
    # Find LaTeX file
    latex_file = None
    for file in os.listdir(topic_path):
        if file.lower().endswith(('.tex', '.txt')):
            latex_file = os.path.join(topic_path, file)
            break
    
    if not latex_file:
        print(f"❌ No LaTeX file found")
        return
    
    # Read and parse
    with open(latex_file, 'r', encoding='utf-8') as f:
        latex_content = f.read()
    
    print(f"🔍 Debugging LaTeX structure for: {subject_name}/{topic_name}")
    print(f"📄 File: {latex_file}")
    print("="*50)
    
    content_to_part_mapping = parse_latex_structure(latex_content)
    
    print("\n📋 Final Mapping:")
    for content, part in content_to_part_mapping.items():
        print(f"   '{content}' → '{part}'")

if __name__ == "__main__":
    ROOT_DIRECTORY = r"D:\Tutor\Tutor-App-deploy\backend\app\Tutor data"
    
    # Option 1: Process all topics with smart parsing
    print("🧠 Using SMART LATEX PARSING approach...")
    process_all_topics_with_smart_parsing(ROOT_DIRECTORY)
    
    # Option 2: Debug specific topic structure (uncomment to use)
    # debug_latex_structure("গণিত", "Set Theory", ROOT_DIRECTORY)
    
    # Option 3: Process specific topic (uncomment to use)
    # process_images_with_latex_parsing("গণিত", "Set Theory", ROOT_DIRECTORY)