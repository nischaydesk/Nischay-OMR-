import io
import json
import openpyxl
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
        details = data.get("details", [])
        
        # openpyxl से सीधे एक्सेल वर्कबुक बनाना (बिना pandas के)
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "OMR_Result"
        
        # हेडर
        headers = ["Question", "Student_Marked", "Answer_Key", "Status", "Marks"]
        ws.append(headers)
        
        # डेटा पंक्तियाँ
        for row in details:
            ws.append([
                row.get("Question", ""),
                row.get("Student_Marked", ""),
                row.get("Answer_Key", ""),
                row.get("Status", ""),
                row.get("Marks", 0.0)
            ])
            
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        return StreamingResponse(
            output,
            headers={'Content-Disposition': 'attachment; filename="Nischay_OMR_Report.xlsx"'},
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
