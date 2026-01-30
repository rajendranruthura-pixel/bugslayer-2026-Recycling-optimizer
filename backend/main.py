from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse

app = FastAPI()

@app.post("/predict/")
async def predict(file: UploadFile = File(...)):
    # TODO: Add your ML model inference here
    # For now, return a mock response
    return JSONResponse({
        "prediction": "plastic",
        "confidence": 0.92
    })
