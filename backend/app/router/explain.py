
from fastapi import APIRouter, Depends, HTTPException, Header, Request,BackgroundTasks
from fastapi.responses import StreamingResponse
import json 
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select, update
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
import asyncio
from concurrent.futures import Future
import re

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


# ADD THIS: Async database engine - loads from env and converts to async
DATABASE_URL = os.getenv("DATABASE_URL")  # For production (Cloud Run)

# Fallback for local development
if DATABASE_URL is None:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=r"C:\E backup\tutor app deploy\Tutor-App\backend\app\.env") 
    DATABASE_URL = os.getenv("DATABASE_URL")
    print(DATABASE_URL)
    
async_database_url = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
# ADD THIS: Async database engine
async_engine = create_async_engine(
     async_database_url,  # Replace with your DB URL
    pool_size=50,
    max_overflow=100,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False
)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Async database dependency
async def get_async_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
# Create client
client = genai.Client(api_key=api_key)
MODEL="gemini-2.5-flash"

def generate_gemini_response(prompt: str,system_instruction:str="", temperature: float = 0.2,image_base64: Optional[str] = None) -> str:
    """
    Generate response using Gemini API
    
    Args:
        prompt: The prompt to send to Gemini
        temperature: Temperature setting for generation (default 0.2)
    
    Returns:
        Generated text response
    """
    # Build contents list
    contents = []
    
    # Add image if provided
    if image_base64:
        image_bytes = base64.b64decode(image_base64)
        image_part = types.Part.from_bytes(
            data=image_bytes, 
            mime_type="image/jpeg"  # Adjust if you have different image types
        )
        contents.append(image_part)
    # else:
    #     contents.append("no image exists")
    #  response = client.models.generate_content(
    #         model=MODEL,
    #         contents=contents,
    #         config=types.GenerateContentConfig(
    #             thinking_config=types.ThinkingConfig(thinking_budget=-1),
    #             system_instruction="explain image if it exist or  write no image here ",  # Move this OUTSIDE config
    #             temperature=temperature
    #         )
            
    #     )
    # Add text prompt
    contents.append(prompt)
   
    response = client.models.generate_content(
            model=MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0),
                system_instruction=system_instruction,  # Move this OUTSIDE config
                temperature=temperature
            )
            
        )
   
    # response=r"$$\text{পরিসর} = (90 - 35) + 1 = 55 + 1 = 56 $$"
    
    return response.text.strip()

async def generate_gemini_response_stream(prompt: str, system_instruction: str = "", temperature: float = 0.2,image_base64: Optional[str] = None):
    """Generate streaming response using Gemini API"""

    
    queue = asyncio.Queue()
    loop = asyncio.get_event_loop()  # Get loop reference BEFORE thread
    
    def _stream_in_thread(event_loop):  # Accept loop parameter
        # Add image if provided
        contents = []
        if image_base64:
            image_bytes = base64.b64decode(image_base64)
            image_part = types.Part.from_bytes(
                data=image_bytes, 
                mime_type="image/jpeg"
            )
            contents.append(image_part)
        # Add text prompt
        contents.append(prompt)
        try:
            response = client.models.generate_content_stream(
                model=MODEL,
                contents=contents,
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_budget=-1),
                    system_instruction=system_instruction,
                    temperature=temperature
                )
            )
            full_text = ""
            for chunk in response:
                if chunk.text:
                    full_text += chunk.text
                    asyncio.run_coroutine_threadsafe(queue.put(chunk.text), event_loop)
            # Signal completion with full text
            asyncio.run_coroutine_threadsafe(queue.put(f"[COMPLETE]{full_text}"), event_loop)
        except Exception as e:
            asyncio.run_coroutine_threadsafe(queue.put(f"[ERROR]{str(e)}"), event_loop)
        finally:
            asyncio.run_coroutine_threadsafe(queue.put(None), event_loop)  # End signal
    
    # Start streaming in executor with loop parameter
    loop.run_in_executor(executor, _stream_in_thread, loop)  # Pass loop as argument
      # ADD THIS PART:
    # Yield chunks as they arrive
    while True:
        chunk = await queue.get()
        if chunk is None:  # End signal
            break
        yield chunk
# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



async def pre_generate_continue_response(user_id: int, subtopic_id: int, chunks: list, subject: str,topic:str=""):
    """
    Pre-generate the next continue response and store it in the database
    """
    try:
        async with AsyncSessionLocal() as db:
            # Get current progress
            result = await db.execute(
                select(UserProgress).filter(
                    UserProgress.user_id == user_id,
                    UserProgress.subtopic_id == subtopic_id
                )
            )
            progress = result.scalar_one_or_none()
            
            if not progress:
                print("❌ UserProgress not found in background task")
                return
            
            next_chunk_index = progress.chunk_index + 1
            
            # Don't pre-generate beyond last chunk
            if next_chunk_index >= len(chunks):
                # Clear any existing pre-generated response since we're at the end
                await db.execute(
                    update(UserProgress)
                    .filter(
                        UserProgress.user_id == user_id,
                        UserProgress.subtopic_id == subtopic_id
                    )
                    .values(
                        next_continue_response=None,
                        next_continue_image=None,
                        next_response_chunk_index=None
                    )
                )
                await db.commit()
                return
                
            # Get the next chunk and its image
            next_chunk = chunks[next_chunk_index]
            next_image_data = await get_image_data_from_chunk(next_chunk, progress.subtopic_id, db)
            
            if next_image_data:
                print("\n image exist")
            else:
                print("\n image no exist ")        
                
            # Build prompt for the next chunk
            continue_query = ""
            prompt, system_instruction = build_prompt(continue_query, progress.chat_memory, None, next_chunk, subject,topic)
            
            # Generate AI response using thread pool (keep this sync call in executor)
            loop = asyncio.get_event_loop()
            generated_answer = await loop.run_in_executor(executor, generate_gemini_response, prompt, system_instruction, 0.3,next_image_data)
            
            # Store pre-generated response in database using async update
            await db.execute(
                update(UserProgress)
                .filter(
                    UserProgress.user_id == user_id,
                    UserProgress.subtopic_id == subtopic_id
                )
                .values(
                    next_continue_response=generated_answer,
                    next_continue_image=next_image_data,
                    next_response_chunk_index=next_chunk_index
                )
            )
            await db.commit()
            
            print(f"✅ Pre-generated continue response for chunk {next_chunk_index}")
                
    except Exception as e:
        print(f"❌ Pre-generation failed: {e}")
        # Clear pre-generated data on failure if possible
        try:
            async with AsyncSessionLocal() as db:
                await db.execute(
                    update(UserProgress)
                    .filter(
                        UserProgress.user_id == user_id,
                        UserProgress.subtopic_id == subtopic_id
                    )
                    .values(
                        next_continue_response=None,
                        next_continue_image=None,
                        next_response_chunk_index=None
                    )
                )
                await db.commit()
        except:
            pass  # If this fails too, just log and continue

async def get_image_data_from_chunk(chunk: str, subtopic_id: int,db: AsyncSession) -> Optional[str]:
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
        match = re.match(r'\\(section|subsection|textbf)\*?\{([^}]*)\}', first_line)
        # Clean the first line by removing LaTeX commands (\section, \subsection, \textbf) and braces

        # # Remove braces and any remaining LaTeX markup
        if match:
            description = match.group(2).strip()  # e.g., "সম্পাদ্য ১ ধাপ ১" or "Introduction"
        else:
            # Fallback: Remove braces and keep the line as is
            description = first_line.replace("{", "").replace("}", "").strip()

        if description:
            # Query the Diagram table for an image where the description contains the cleaned first line (case-insensitive)
            result = await db.execute(
                select(Diagram).filter(
                    Diagram.subtopic_id == subtopic_id,
                   func.lower(Diagram.description) == func.lower(description)
                )
            )
            diagram = result.scalar_one_or_none()
            if diagram and diagram.image_content:
                # Encode the image content as base64 for the frontend
                image_data = base64.b64encode(diagram.image_content).decode('utf-8')
    return image_data

# NEW: Modified /explains/ endpoint to use UserProgress table instead of session

# Create router
router = APIRouter(
    tags=["explains"]
)

async def authenticate_and_validate_user(authorization: Optional[str], user_id: int, db: AsyncSession) -> User:
    try:
        user_data = get_user_from_token(authorization)
        if user_data.get("id") != user_id:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid token")
    except:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid or missing token")
    
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail=f"User ID {user_id} not found")
    
    return user

async def validate_subject_topic_subtopic(db: AsyncSession, subject: str, topic: str, subtopic: str) -> tuple:
    result = await db.execute(
        select(Subject, Topic, Subtopic)
        .join(Topic, Subject.id == Topic.subject_id)
        .join(Subtopic, Topic.id == Subtopic.topic_id)
        .filter(
            Subject.name == subject,
            Topic.name == topic,
            Subtopic.name == subtopic
        )
    )
    row = result.first()
    
    if not row:
        # More specific error checking
        subject_result = await db.execute(select(Subject).filter(Subject.name == subject))
        subject_obj = subject_result.scalar_one_or_none()
        
        if not subject_obj:
            raise HTTPException(status_code=404, detail=f"Subject {subject} not found")
        
        topic_result = await db.execute(
            select(Topic).filter(Topic.name == topic, Topic.subject_id == subject_obj.id)
        )
        topic_obj = topic_result.scalar_one_or_none()
        
        if not topic_obj:
            raise HTTPException(status_code=404, detail=f"Topic {topic} not found in subject {subject}")
        
        raise HTTPException(status_code=404, detail=f"Subtopic {subtopic} not found in topic {topic}")
    
    return row


async def process_query_logic(query: str, subject: str, chunks: list, chunk_index: int, 
                       chat_memory: list, explain_query: ExplainQuery, progress: UserProgress,  user_id: int, subtopic_id: int, db: AsyncSession):
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
         # Use async update instead of object modification
        await db.execute(
            update(UserProgress)
            .filter(
                UserProgress.user_id == user_id,
                UserProgress.subtopic_id == subtopic_id
            )
            .values(
                chunk_index=0,
                chat_memory=[]
            )
        )
        await db.commit()
        
      
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




def build_prompt(query: str, chat_memory: list, context, chunks, subject: str,topic:str) ->  tuple[str, str]:
      # NEW: Prepare memory_text from UserProgress.chat_memory
    memory_text = "\n\n".join([
        f"User: {pair['question']}\nAssistant: {pair['answer']}"
        for pair in chat_memory[-30:]
    ]) if chat_memory else "No prior conversation."
    
    
  #  print(f"gemini api will get this \n the chatmemory:{chat_memory}\n\n chunk is {chunks}")
    if subject =='গণিত' or subject == "উচ্চতর গণিত":
        system_instruction =r"""
      আপনি বাংলাদেশের ৯-১০ শ্রেণির শিক্ষাগত সহকারী। সহজ ভাষায় ধাপে ধাপে পাঠের অংশ শেখান।

নির্দেশিকা:
1. মজার ও আকর্ষণীয় ব্যাখ্যা, প্রয়োজনে গল্প
2. কথোপকথনের স্মৃতি ব্যবহার করে ব্যক্তিগতকরণ  
3. মার্কডাউন ব্যবহার করুন 
4. শুধু টেক্সট ব্যবহার করুন, কোনো ASCII আর্ট নয়
5.সাধারণ লেখা ও তালিকার জন্য সহজ টেক্সট ফরম্যাটিং ব্যবহার করুন।  শুধু গাণিতিক প্রকাশ জন্য ল্যাটেক্স ব্যবহার করবেন
6. গাণিতিক প্রকাশ:
   - ইনলাইন: $x = 5$, $x^2 = 25$ 
   - সমীকরণ: $\frac{a + b}{c - d} = \frac{10}{5}$, $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$
   - LaTeX: $\sin^2\theta + \cos^2\theta = 1$

7. টেবিল উদাহরণ:
   |নাম|বয়স|শ্রেণী|
   |---|---|---|
   |রহিম|14|নবম|
   
   |সূত্র|উদাহরণ|ফলাফল|
   |:---|:---:|---:|
   |বর্গ|$x^2$ যখন $x=5$|$25$|

লক্ষ্য: আনন্দের সাথে সহজে শেখানো।
        """
       # 5. ট্যালি: $\text{||||}$(4), $\cancel{\text{||||}}$(5), 9=$\cancel{\text{||||}}$ $\text{||||}$, 18=$\cancel{\text{||||}}$ $\cancel{\text{||||}}$ $\cancel{\text{||||}}$ $\text{|||}$
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
        prompt = f"""
        ব্যবহারকারী:
        {query}

সাম্প্রতিক কথোপকথনের ইতিহাস:
{memory_text}


পাঠের অংশ:
{context if context else chunks}

পাঠের অংশ ধাপে ধাপে ভেঙে বুঝাও। উদাহরণ থাকলে সেটিও সহজ করে উপস্থাপন করো।
শুধু টেক্সট ব্যবহার করুন, কোনো ASCII আর্ট নয়

"""
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
                                           explain_query: ExplainQuery,user_id: int, subtopic_id: int,db: AsyncSession, 
                                           image_data: Optional[str] = None):  # Add image parameter
    
    async def stream_generator():
        full_answer = ""
        async for chunk in generate_gemini_response_stream(prompt, system_instruction, 0.3, image_data):
            if chunk.startswith("[COMPLETE]"):
                # Extract full text for DB update
                full_answer = chunk[10:]  # Remove [COMPLETE] prefix
            else:
                yield f"data: {json.dumps({'content': chunk})}\n\n"
        
        # Update database after streaming completes
        new_pair = {"question": explain_query.query, "answer": full_answer}
        chat_memory_updated = progress.chat_memory + [new_pair] 
        
        if len(chat_memory_updated) > 30:
            chat_memory_updated = chat_memory_updated[-30:]
       
        await db.execute(
            update(UserProgress)
            .filter(
                UserProgress.user_id == user_id,
                UserProgress.subtopic_id == subtopic_id
            )
            .values(
                chat_memory=chat_memory_updated,
                chunk_index=chunk_index,
                last_updated=datetime.utcnow()
            )
        )
        await db.commit()
        
        # Send image at the end if exists
        if image_data:
            yield f"data: {json.dumps({'image': image_data})}\n\n"
        
        yield f"data: {json.dumps({'status': 'complete'})}\n\n"
    
    return StreamingResponse(stream_generator(), media_type="text/event-stream")



# AFTER
@router.post("/{subject}/{topic}/{subtopic}/explains/", response_model=ExplainResponse)
async def post_explain(
    subject: str,
    topic: str,
    subtopic: str,
    explain_query: ExplainQuery,
    background_tasks: BackgroundTasks,
    user_id: int = Header(...),
    db: AsyncSession = Depends(get_async_db),
    authorization: Optional[str] = Header(None)
):
    # Keep these as sync calls - they're fast database queries
    user = await authenticate_and_validate_user(authorization, user_id, db)
    subject_obj, topic_obj, subtopic_obj = await validate_subject_topic_subtopic(db, subject, topic, subtopic)
  
    # Fetch explain record
    result = await db.execute(select(Explain).filter(Explain.subtopic_id == subtopic_obj.id))
    explain = result.scalar_one_or_none()
    
    result = await db.execute(
        select(UserProgress).filter(
            UserProgress.user_id == user_id,
            UserProgress.subtopic_id == subtopic_obj.id
        )
    )
    temp_progress = result.scalar_one_or_none()
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
        await db.commit()
        await db.refresh(progress)
    
    
       
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
        
        await db.execute(
            update(UserProgress)
            .filter(
                UserProgress.user_id == user_id,
                UserProgress.subtopic_id == subtopic_obj.id
            )
            .values(
                chat_memory=chat_memory_updated,
                chunk_index=progress.next_response_chunk_index, 
                last_updated=datetime.utcnow()
            )
         )
        await db.commit()
        
        # Clear used response with async update
        await db.execute(
            update(UserProgress)
            .filter(
                UserProgress.user_id == user_id,
                UserProgress.subtopic_id == subtopic_obj.id
            )
            .values(
                next_continue_response=None,
                next_continue_image=None,
                next_response_chunk_index=None
            )
        )
        await db.commit()
        
        # Start background generation for next response
        background_tasks.add_task(
    pre_generate_continue_response,
    user_id,
    subtopic_obj.id,
    chunks,
    subject,
    topic
)
        current_dir = os.getcwd()
        filename = os.path.join(current_dir, "explain_raw_text.txt")
        with open(filename, 'w', encoding='utf-8') as file:
            file.write(answer)
        return ExplainResponse(answer=answer, image=image)

    chunk_index = progress.chunk_index
   
    chat_memory = progress.chat_memory

   
    result = await process_query_logic(explain_query.query, subject, chunks, chunk_index, 
                                   chat_memory, explain_query, progress, user_id, subtopic_obj.id, db)
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
    image_data = await get_image_data_from_chunk(selected_chunk, subtopic_obj.id, db)
    
    if image_data:
        print("\nimage exist\n")
    else:
        print("\n image no exist ") 


    
    prompt, system_instruction =  build_prompt(query, chat_memory, context, selected_chunk, subject,topic)
    # Pass image_data to the streaming function
    response = await generate_ai_response_and_update_progress(
    prompt, system_instruction, query, explain_query.query, 
    progress, chunk_index, explain_query, user_id, subtopic_obj.id, db,
    image_data=image_data  # Pass the image
    )

# Start background generation for next continue
    background_tasks.add_task(
    pre_generate_continue_response,
    user_id,
    subtopic_obj.id,
    chunks,
    subject,
    topic
)

    return response