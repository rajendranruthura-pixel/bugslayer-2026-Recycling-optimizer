from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI
import base64
import os
import json
import random

# Load .env file
load_dotenv(override=True)

app = FastAPI(title="Waste Sorter Backend")

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for demo purposes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

WASTE_PROMPT = """
You are an AI-based Waste Segregation Assistant.

Follow these steps strictly:
1. Identify the waste object.
2. Classify it as Wet Waste, Dry Waste, or Recyclable Waste.
3. Assign highlight color:
   Green = Wet Waste
   Blue = Dry Waste
   Yellow = Recyclable Waste
4. Recommend correct dustbin color.
5. Give one simple disposal tip.
6. Award 10 points.

Respond ONLY in JSON format:
{
  "object": "",
  "category": "",
  "highlight_color": "",
  "bin": "",
  "tip": "",
  "points": 10
}
"""

# ---------------- WASTE AI API ---------------- #

@app.post("/predict-waste")
async def predict_waste(image: UploadFile = File(...)):
    if not os.getenv("OPENAI_API_KEY"):
         raise HTTPException(status_code=500, detail="OpenAI API Key not set. Please set OPENAI_API_KEY environment variable.")

    try:
        img_bytes = await image.read()
        encoded_img = base64.b64encode(img_bytes).decode("utf-8")

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": WASTE_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Analyze this waste image."},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{encoded_img}"}
                        }
                    ]
                }
            ]
        )

        content = response.choices[0].message.content
        # Parse JSON string to JSON object to avoid double serialization
        try:
             json_content = json.loads(content)
             return json_content
        except json.JSONDecodeError:
             return {"error": "Failed to parse AI response", "raw_content": content}

    except Exception as e:
        print(f"Error processing request: {e}")
        # Fallback to Mock Data
        print("Falling back to Mock Data due to error.")
        try:
            with open("waste_mock_data.json", "r") as f:
                mock_data = json.load(f)
            return random.choice(mock_data)
        except Exception as mock_e:
            raise HTTPException(status_code=500, detail=f"API Error: {str(e)}. Mock Error: {str(mock_e)}")

@app.get("/")
def root():
    return {"message": "Waste Sorter API is running"}

