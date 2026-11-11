import io
import json
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from omr_engine import process_omr

app = FastAPI(title="Nischay OMR API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "online", "system": "Nischay OMR Enterprise Backend"}

@app.post("/api/scan")
async def scan_sheet(
    file: UploadFile = File(...),
    answer_key: str = Form(...),
    total_q: int = Form(20)
):
    try:
        raw_key = json.loads(answer_key)
        parsed_key = {int(k): v.upper() for k, v in raw_key.items()}
    except Exception:
        raise HTTPException(status_code=400, detail="Answer key फ़ॉर्मेट अमान्य है।")

    contents = await file.read()
    try:
        output = process_omr(contents, parsed_key, total_q)
        return output
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/export-excel")
async def export_excel(payload: str = Form(...)):
    try:
        data = json.loads(payload)
        df = pd.DataFrame(data["details"])
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name="Result")
        output.seek(0)
        return StreamingResponse(
            output,
            headers={'Content-Disposition': 'attachment; filename="Nischay_OMR_Report.xlsx"'},
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
