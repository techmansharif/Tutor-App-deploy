from fastapi import APIRouter, Depends, HTTPException, Header, Request,BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from ..database.session import SessionLocal
from ..database.models import Subject, Topic, Subtopic, User, Explain, UserProgress, Diagram
from ..schemas.explains import ExplainQuery, ExplainResponse
from sqlalchemy.sql import func
import base64
import os
from sentence_transformers import SentenceTransformer
import faiss
from google import genai
from google.genai import types
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Import JWT utils
from ..jwt_utils import get_user_from_token


# Preload SentenceTransformer globally to avoid repeated loading
model = SentenceTransformer('all-MiniLM-L6-v2')

# Get CPU count and set workers accordingly
cpu_count = os.cpu_count() or 4
# Use 1.5x CPU cores for mixed I/O and CPU tasks, max 8 to prevent overload
# For Cloud Run with 1 CPU, override to use more workers
max_workers = 8 if cpu_count <= 2 else min(int(cpu_count * 1.5), 8)
executor = ThreadPoolExecutor(max_workers=max_workers)


# Setup Gemini API globally
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("Gemini API key not configured")


# Create client
client = genai.Client(api_key=api_key)
MODEL="gemini-2.5-flash"

def generate_gemini_response(prompt: str,system_instruction:str="", temperature: float = 0.2) -> str:
    """
    Generate response using Gemini API
    
    Args:
        prompt: The prompt to send to Gemini
        temperature: Temperature setting for generation (default 0.2)
    
    Returns:
        Generated text response
    """
   
    response = client.models.generate_content(
            model=MODEL,
            contents=[prompt],
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=-1),
                system_instruction=system_instruction,  # Move this OUTSIDE config
                temperature=temperature
            )
            
        )
    # response=r"$$\text{পরিসর} = (90 - 35) + 1 = 55 + 1 = 56 $$"
    
    return response.text.strip()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



async def pre_generate_continue_response(user_id: int, subtopic_id: int, chunks: list, subject: str):
    """
    Pre-generate the next continue response and store it in the database
    """
    def _pre_generate_sync(user_id: int, subtopic_id: int, chunks: list, subject: str):
        
        db = SessionLocal()
        try:
            # Re-query the progress object
            progress = db.query(UserProgress).filter(
                UserProgress.user_id == user_id,
                UserProgress.subtopic_id == subtopic_id
            ).first()
            
            if not progress:
                print("❌ UserProgress not found in background task")
                return
            
            next_chunk_index = progress.chunk_index + 1
            
            # Don't pre-generate beyond last chunk
            if next_chunk_index >= len(chunks):
                # Clear any existing pre-generated response since we're at the end
                progress.next_continue_response = None
                progress.next_continue_image = None
                progress.next_response_chunk_index = None
                db.commit()
                return
                
            # Get the next chunk and its image
            next_chunk = chunks[next_chunk_index]
            next_image_data = get_image_data_from_chunk(next_chunk, progress.subtopic_id, db)
            
            if next_image_data:
                print("\n image exist")
            else:
                print("\n image no exist ")        
            # Build prompt for the next chunk
            # continue_query = "Explain the context easy fun way"
            continue_query = ""
            prompt,system_instruction = build_prompt(continue_query, progress.chat_memory, None, next_chunk, subject)
            
        # print(f"\nfor pregenration chat memory  {(progress.chat_memory)}\n")
            # Generate AI response
            generated_answer =generate_gemini_response(prompt,system_instruction, temperature=0.3)
            
            
            
            
            # # Save to file for debugging (optional)
            # current_dir = os.getcwd()
            # filename = os.path.join(current_dir, "pre_generated_response.txt")
            # with open(filename, 'w', encoding='utf-8') as file:
            #     file.write(f"Pre-generated for chunk {next_chunk_index}:\n{generated_answer}")
            
            # Store pre-generated response in database
            progress.next_continue_response = generated_answer
            progress.next_continue_image = next_image_data
            progress.next_response_chunk_index = next_chunk_index
            
            # Commit to database
            db.commit()
            
            print(f"✅ Pre-generated continue response for chunk {next_chunk_index}")
                
        except Exception as e:
            print(f"❌ Pre-generation failed: {e}")
            # Clear pre-generated data on failure
            try:
                progress.next_continue_response = None
                progress.next_continue_image = None
                progress.next_response_chunk_index = None
                db.commit()
            except:
                pass  # If this fails too, just log and continue
        finally:
            db.close()  # Always close the session
        # Run the sync function in thread pool
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(executor, _pre_generate_sync, user_id, subtopic_id, chunks, subject)


def get_image_data_from_chunk(chunk: str, subtopic_id: int, db: Session) -> Optional[str]:
    """
    Fetches and encodes image data from the Diagram table if the chunk contains 'image description'.
    Uses the raw first line of the chunk, cleans LaTeX commands (\section, \subsection, \textbf),
    and performs a substring search against Diagram.description.
    
    Args:
        chunk (str): The chunk text to search for image description.
        subtopic_id (int): The ID of the subtopic to query diagrams for.
        db (Session): SQLAlchemy session for database operations.
    
    Returns:
        Optional[str]: Base64-encoded image data, or None if no image is found.
    """
    image_data = None
    if isinstance(chunk, str) and "image description".lower() in chunk.lower():
        # Split the chunk into lines and get the first line
        lines = chunk.split('\n')
        if not lines:
            return None  # No lines in the chunk

        first_line = lines[0].strip()  # e.g., "\subsection*{Union of Sets}" or "\section*{Introduction}" or "\textbf{Key Concepts}"

        # Clean the first line by removing LaTeX commands (\section, \subsection, \textbf) and braces
        description = first_line
        # Remove common LaTeX commands and their variants (with or without *)
        for cmd in ["\\section*", "\\section", "\\subsection*", "\\subsection", "\\textbf"]:
            description = description.replace(cmd, "")
        # Remove braces and any remaining LaTeX markup
        description = description.replace("{", "").replace("}", "").strip()  # e.g., "Union of Sets"

        if description:
            # Query the Diagram table for an image where the description contains the cleaned first line (case-insensitive)
            diagram = db.query(Diagram).filter(
                Diagram.subtopic_id == subtopic_id,
                func.lower(Diagram.description).contains(func.lower(description))
            ).first()
            if diagram and diagram.image_content:
                # Encode the image content as base64 for the frontend
                image_data = base64.b64encode(diagram.image_content).decode('utf-8')
    return image_data

# NEW: Modified /explains/ endpoint to use UserProgress table instead of session

# Create router
router = APIRouter(
    tags=["explains"]
)

def authenticate_and_validate_user(authorization: Optional[str], user_id: int, db: Session) -> User:
    try:
        user_data = get_user_from_token(authorization)
        if user_data.get("id") != user_id:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid token")
    except:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid or missing token")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User ID {user_id} not found")
    
    return user


def validate_subject_topic_subtopic(db: Session, subject: str, topic: str, subtopic: str) -> tuple:
    # Single query with JOINs to get all three objects
    result = db.query(Subject, Topic, Subtopic).join(
        Topic, Subject.id == Topic.subject_id
    ).join(
        Subtopic, Topic.id == Subtopic.topic_id
    ).filter(
        Subject.name == subject,
        Topic.name == topic,
        Subtopic.name == subtopic
    ).first()
    
    if not result:
        # More specific error checking if needed
        subject_obj = db.query(Subject).filter(Subject.name == subject).first()
        if not subject_obj:
            raise HTTPException(status_code=404, detail=f"Subject {subject} not found")
        
        topic_obj = db.query(Topic).filter(
            Topic.name == topic, Topic.subject_id == subject_obj.id
        ).first()
        if not topic_obj:
            raise HTTPException(status_code=404, detail=f"Topic {topic} not found in subject {subject}")
        
        raise HTTPException(status_code=404, detail=f"Subtopic {subtopic} not found in topic {topic}")
    
    subject_obj, topic_obj, subtopic_obj = result
    return subject_obj, topic_obj, subtopic_obj


async def process_query_logic(query: str, subject: str, chunks: list, chunk_index: int, 
                       chat_memory: list, explain_query: ExplainQuery, progress: UserProgress, db: Session):
      # Handle query
    query = query.lower()
    context = None
    

    if query == "explain":
        if subject =="English":
            query="please explain in easier english and easily"
        else:
            query = "please explain more easily and elaborately"
        context = None
            # After determining context and chunk_index
        selected_chunk =chunks[chunk_index]
                
    elif query == "continue":
        
        chunk_index += 1

        # query = "Explain the context easy fun way"
        query = ""
        context = None
            # After determining context and chunk_index
        selected_chunk =chunks[chunk_index]
    elif query == "refresh":
      #  print("\n\n i am here inside refresh screen \n\n")
        chunk_index = 0 # Start from chunk_index = 1
        progress.chunk_index = chunk_index
       
        progress.chat_memory = []  # Clear chat_memory
        
        db.commit()
        
      
        query =  "Explain the context easy fun way"
        context = None
        
        selected_chunk = chunks[chunk_index]
    else:
        
        if subject == 'গণিত' or subject == "উচ্চতর গণিত":
            # Return Bengali message for Bengali subjects
            bengali_message = "দুঃখিত, এই সেবাটি শুধুমাত্র English বিষয়ের জন্য প্রযোজ্য। অনুগ্রহ করে 'নতুনভাবে ও সহজভাবে বলুন(AI)' বা 'পরবর্তী অংশে যান' ব্যবহার করুন।"
            return ExplainResponse(answer=bengali_message, image=None)

        

        # Only allow custom queries for English subject - but check relevance
        # Custom query with FAISS
        # model = SentenceTransformer('all-MiniLM-L6-v2')
        def _faiss_search():
            embeddings = model.encode(chunks, convert_to_numpy=True)
            dimension = embeddings.shape[1]
            index = faiss.IndexFlatL2(dimension)
            index.add(embeddings)
            query_embedding = model.encode([query], convert_to_numpy=True)
            top_k = 3
            distances, indices = index.search(query_embedding, top_k)
            return distances, indices
        loop = asyncio.get_event_loop()
        distances, indices = await loop.run_in_executor(executor, _faiss_search)   
         # Check relevance - if the closest match has too high distance, it's irrelevant
        min_distance = distances[0][0]  # Get the smallest distance (closest match)
        RELEVANCE_THRESHOLD = 1.5  # Adjust this threshold as needed
        if min_distance > RELEVANCE_THRESHOLD:
            # Query is not relevant to the content
            return "IRRELEVANT_ENGLISH_QUERY", None, None, chunk_index
        context = [chunks[idx] for idx in indices[0]]
        selected_chunk=None
    return query, context, selected_chunk, chunk_index




def build_prompt(query: str, chat_memory: list, context, chunks, subject: str) ->  tuple[str, str]:
      # NEW: Prepare memory_text from UserProgress.chat_memory
    memory_text = "\n\n".join([
        f"User: {pair['question']}\nAssistant: {pair['answer']}"
        for pair in chat_memory[-30:]
    ]) if chat_memory else "No prior conversation."
    
    
  #  print(f"gemini api will get this \n the chatmemory:{chat_memory}\n\n chunk is {chunks}")
    if subject =='গণিত' or subject == "উচ্চতর গণিত":
        system_instruction =r"""
        আপনি একজন শিক্ষাগত সহকারী। আপনার কাজ হল বাংলাদেশের ৯-১০ শ্রেণির শিক্ষার্থীদের সহজ ও ধাপে ধাপে শেখানো। আপনার বাক্যগুলো সহজ হতে হবে।

আপনার শিক্ষা পদ্ধতি:
1. তথ্য মজার এবং আকর্ষণীয় উপায়ে ব্যাখ্যা করুন
2. ব্যাখ্যাটি আকর্ষণীয় করুন, প্রয়োজনে গল্প ব্যবহার করুন
3. সাম্প্রতিক কথোপকথনের স্মৃতি ব্যবহার করে উত্তরটি ব্যক্তিগত করুন
4. সব টেক্সট, শিরোনাম এবং তালিকার জন্য মার্কডাউন ব্যবহার করুন
5. গাণিতিক প্রকাশ:
   - ইনলাইন গণিত: একক ডলার চিহ্নে আবদ্ধ করুন
     উদাহরণ:  $x = 5$  ,  $x^2 = 25$ 
   - সমীকরণ: Enclose in double dollar signs
    উদাহরণ:
   $$ \frac{a}{b} $$
   $$\frac{a + b}{c - d} = \frac{10}{5}$$, $$\text{পরিসর} = (90 - 35) + 1 = 55 + 1 = 56$$ ,
     $$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$
   - সঠিক LaTeX syntax নিশ্চিত করুন
     $$\sin^2\theta + \cos^2\theta = 1$$
6. প্রয়োজনে সারসংক্ষেপ বা তুলনামূলক বিশ্লেষণের জন্য Markdown টেবিল ব্যবহার করুন
Basic Table (বেসিক টেবিল):
markdown| নাম | বয়স | শ্রেণী |
|-----|------|--------|
| রহিম | 14 | নবম |
| করিম | 15 | দশম |
| সালমা | 14 | নবম |
Table with Alignment (সারিবদ্ধ টেবিল):
markdown| পণ্য | পরিমাণ | মূল্য (টাকা) | মোট |
|:-----|-------:|:------------:|----:|
| কলম | 5 | 10 | 50 |
| খাতা | 3 | 40 | 120 |
| রাবার | 2 | 5 | 10 |
| **সর্বমোট** | | | **180** |
Math in Tables (টেবিলে গণিত):
markdown| সূত্র | উদাহরণ | ফলাফল |
|:------|:------:|-------:|
| বর্গ | $x^2$ যখন $x=5$ | $25$ |
| বর্গমূল | $\sqrt{16}$ | $4$ |
| ভগ্নাংশ | $\frac{10}{2}$ | $5$ |

লক্ষ্য: শিক্ষার্থীরা যেন আনন্দের সাথে এবং সহজে বিষয়টি বুঝতে পারে।
        """
    elif subject=="English":
        system_instruction = r"""You are an educational assistant tasked with creating a step-by-step learning guide for a user. Your sentences should be simple.

Your teaching approach:
1. Explain content in fun and interesting ways
2. Make explanations engaging, use stories if necessary
3. Use memory of recent conversations to personalize responses
4. Reply in very simple English and write meanings around difficult words if necessary
5. Use Markdown for formatting when appropriate
"""
    else:
        system_instruction="Explain in easy and fun way"
        
        
    if subject == 'গণিত' or subject == "উচ্চতর গণিত":
        prompt = f"""ব্যবহারকারীর প্রশ্ন:
{query}

সাম্প্রতিক কথোপকথনের ইতিহাস:
{memory_text}

প্রাসঙ্গিক তথ্য:
{context if context else chunks}"""
    else:
        prompt = f"""User Input:
    {query}

    Recent Chat History:
    {memory_text}

    Relevant Text:
    {context if context else chunks}"""
    
    return prompt, system_instruction
   
   




async def generate_ai_response_and_update_progress(prompt: str,system_instruction:str, query: str, answer_text: str, 
                                           progress: UserProgress, chunk_index: int, 
                                           explain_query: ExplainQuery, db: Session) -> str:

    
    # Generate response
    # Run Gemini API call in threadpool
    loop = asyncio.get_event_loop()
    answer = await loop.run_in_executor(executor, generate_gemini_response, prompt,system_instruction, 0.3)
    

 
    # NEW: Update UserProgress with new chunk_index and chat_memory
 

    # When updating:
    new_pair = {"question": explain_query.query, "answer": answer}
    chat_memory_updated = progress.chat_memory + [new_pair] 
    
    if len(chat_memory_updated) > 30:
        chat_memory_updated = chat_memory_updated[-30:]  # Keep only last 30

    # Assign the new list to progress.chat_memory
    progress.chat_memory = chat_memory_updated
    progress.chunk_index = chunk_index
    progress.last_updated = datetime.utcnow()
    db.commit()

    return answer



# AFTER
@router.post("/{subject}/{topic}/{subtopic}/explains/", response_model=ExplainResponse)
async def post_explain(
    subject: str,
    topic: str,
    subtopic: str,
    explain_query: ExplainQuery,
    background_tasks: BackgroundTasks,
    user_id: int = Header(...),
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    # Keep these as sync calls - they're fast database queries
    user = authenticate_and_validate_user(authorization, user_id, db)
    subject_obj, topic_obj, subtopic_obj = validate_subject_topic_subtopic(db, subject, topic, subtopic)
  
    # Fetch explain record
    explain = db.query(Explain).filter(Explain.subtopic_id == subtopic_obj.id).first()
    if not explain:
        raise HTTPException(status_code=404, detail=f"No explanations found for subtopic {subtopic}")

    # Load chunks
    chunks = explain.chunks
    if not chunks:
        raise HTTPException(status_code=404, detail="No chunks available for this subtopic") 

    # SIMPLE BENGALI DETECTION FOR ENGLISH SUBJECTS - CHECK THIS FIRST

    if subject == "English":
        bengali_chars = 'অআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহড়ঢ়য়ৎংঃ'
        has_bengali = any(char in explain_query.query for char in bengali_chars)
        # Only block Bengali in custom queries, not explain/continue/refresh
        if has_bengali and explain_query.query.lower() not in ["explain", "continue", "refresh"]:
            sorry_message = "Sorry, this service is only applicable for English subject in English language. Please ask questions in English related to the English subject matter."
            return ExplainResponse(answer=sorry_message, image=None)
    # SIMPLE BENGALI SUBJECT RESTRICTION 
    if (subject == 'গণিত' or subject == "উচ্চতর গণিত") and explain_query.query.lower() not in ["explain", "continue", "refresh"]:
        bengali_message = "দুঃখিত, এই সেবাটি শুধুমাত্র English বিষয়ের জন্য প্রযোজ্য। অনুগ্রহ করে 'নতুনভাবে ও সহজভাবে বলুন(AI)' বা 'পরবর্তী অংশে যান' ব্যবহার করুন।"
        return ExplainResponse(answer=bengali_message, image=None)


    
    
    # Early check for initial explain with existing chat history
    temp_progress = db.query(UserProgress).filter(
        UserProgress.user_id == user_id,
        UserProgress.subtopic_id == subtopic_obj.id
    ).first()
    if (explain_query.query.lower() == "explain" and 
        explain_query.is_initial and 
        temp_progress and 
        temp_progress.chat_memory):
        # Early return - no need for full progress setup
        previous_answers = [str(pair['answer']) for pair in temp_progress.chat_memory]
        return ExplainResponse(answer="", image=None, initial_response=previous_answers)

    # Early check for continue completion
    if (explain_query.query.lower() == "continue" and 
        temp_progress and 
        temp_progress.chunk_index >= len(chunks)-1):
        return ExplainResponse(answer="Congratulations, you have mastered the topic!")

    # ✅ NOW do full progress setup only for cases that need it
    progress = temp_progress
    if not progress:
        progress = UserProgress(
            user_id=user_id,
            subtopic_id=subtopic_obj.id,
            chunk_index=0,
            chat_memory=[]
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
    
    
       
       # 🚀 CHECK FOR PRE-GENERATED CONTINUE RESPONSE
    if (explain_query.query.lower() == "continue" and 
        progress.next_continue_response and 
        progress.next_response_chunk_index == progress.chunk_index + 1):
        
        # Use pre-generated response
        answer = progress.next_continue_response
        image = progress.next_continue_image
        
        # Update progress
        new_pair = {"question": explain_query.query, "answer": answer}
        chat_memory_updated = progress.chat_memory + [new_pair]
        if len(chat_memory_updated) > 30:
            chat_memory_updated = chat_memory_updated[-30:]
        
        progress.chat_memory = chat_memory_updated
        progress.chunk_index = progress.next_response_chunk_index
        progress.last_updated = datetime.utcnow()
        
        # Clear used response
        progress.next_continue_response = None
        progress.next_continue_image = None
        progress.next_response_chunk_index = None
        db.commit()
        
        # Start background generation for next response
        background_tasks.add_task(
    pre_generate_continue_response,
    user_id,
    subtopic_obj.id,
    chunks,
    subject
)
        current_dir = os.getcwd()
        filename = os.path.join(current_dir, "explain_raw_text.txt")
        with open(filename, 'w', encoding='utf-8') as file:
            file.write(answer)
        return ExplainResponse(answer=answer, image=image)

    chunk_index = progress.chunk_index
   
    chat_memory = progress.chat_memory

   
    result =  await process_query_logic(explain_query.query, subject, chunks, chunk_index, 
                                           chat_memory, explain_query, progress, db)
    # ✅ Clear local chat_memory for refresh
    if explain_query.query.lower() == "refresh":
        chat_memory = []

        # Handle early return cases
    if isinstance(result, ExplainResponse):
        return result

    # Unpack results for further processing
    query, context, selected_chunk, chunk_index = result
    if query == "IRRELEVANT_ENGLISH_QUERY":
        print("🚫 RETURNING IRRELEVANT ENGLISH QUERY MESSAGE")
        english_message = "I'm sorry, but your question seems to be out of context for the current English topic we're studying. Please ask questions related to the English subject matter we're covering."
        return ExplainResponse(answer=english_message, image=None)

   # print(f"\n\nGemini API get -------this   {chunk_index}")

    # Fetch image data using the new function
    image_data = get_image_data_from_chunk(selected_chunk, subtopic_obj.id, db)
    
    if image_data:
        print("\nimage exist\n")
    else:
        print("\n image no exist ") 


    
    prompt, system_instruction =  build_prompt(query, chat_memory, context, selected_chunk, subject)
    answer =await generate_ai_response_and_update_progress(prompt,system_instruction, query, explain_query.query, 
                                                                progress, chunk_index, explain_query, db)
    

    # Start background generation for next continue
    background_tasks.add_task(
    pre_generate_continue_response,
    user_id,
    subtopic_obj.id,
    chunks,
    subject
)
    
    return ExplainResponse(answer=answer,image=image_data)


