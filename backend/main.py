from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup DB
DATABASE_URL = os.getenv("DATABASE_URL_RO")
engine = create_engine(DATABASE_URL)

# Request model
class InputData(BaseModel):
    input: str

def load_default_query():
    """Load the default query from file"""
    try:
        query_path = os.path.join(os.path.dirname(__file__), "queries", "default-query.sql")
        with open(query_path, 'r') as file:
            return file.read().strip()
    except FileNotFoundError:
        # Fallback query if file doesn't exist
        return """SELECT 
    d.forename || ' ' || d.surname AS driver, 
    nationality, 
    "year", 
    round_number, 
    c.name AS circuit, 
    "position", 
    points	
FROM formula_one_driverchampionship dc 
INNER JOIN formula_one_driver d ON dc.driver_id = d.id
INNER JOIN formula_one_session s ON dc.session_id = s.id
INNER JOIN formula_one_round r ON dc.round_id = r.id
INNER JOIN formula_one_circuit c ON r.circuit_id = c.id
WHERE s.type = 'R';"""

@app.get("/default-query")
def get_default_query():
    """Endpoint to get the default query"""
    query = load_default_query()
    return {"query": query}

@app.post("/submit-input")
def submit_input(data: InputData):
    user_input = data.input.strip()

    # Example: insert or run a query based on user input
    with engine.connect() as conn:
        result = conn.execute(text(user_input))
        rows = result.mappings().all()

    return {"message": "Received!", "rows": rows}