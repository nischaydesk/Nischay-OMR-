import io
import json
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from omr_engine import process_omr

app = FastAPI(title="Nischay OMR Enterprise API", version="2.4.0")

# CORS सेटअप ताकि GitHub Pages बिना रुकावट कॉल कर सके
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {
        "status": "online",
        "system": "Nischay OMR Pro AI Vision Engine",
        "version": "2.4.0"
    }

@app.post("/api/scan")
async def scan_sheet(
    file: UploadFile = File(...),
    answer_key: str = Form(...),
    total_q: int = Form(20)
):
    try:
        raw_key = json.loads(answer_key)
        parsed_key = {int(k): str(v).strip().upper() for k, v in raw_key.items()}
    except Exception:
        raise HTTPException(status_code=400, detail="Answer key फ़ॉर्मेट अमान्य है।")

    contents = await file.read()
    try:
        # AI विज़न इंजन द्वारा मूल्यांकन (नाम, रोल नंबर और बबल्स)
        output = process_omr(contents, parsed_key, total_q)
        return output
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/export-excel")
async def export_excel(payload: str = Form(...)):
    try:
        data = json.loads(payload)
        details = data.get("details", [])
        summary = data.get("summary", {})
        student_name = data.get("student_name", "STUDENT")
        roll_no = data.get("roll_no", "N/A")

        # openpyxl से स्टाइलयुक्त एक्सेल वर्कबुक बनाना
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "OMR_Scorecard"

        # स्टाइल्स
        header_fill = PatternFill(start_color="1E40AF", end_color="1E40AF", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        meta_font = Font(name="Calibri", size=11, bold=True)
        thin_border = Border(
            left=Side(style='thin', color='E2E8F0'),
            right=Side(style='thin', color='E2E8F0'),
            top=Side(style='thin', color='E2E8F0'),
            bottom=Side(style='thin', color='E2E8F0')
        )
        center_align = Alignment(horizontal="center", vertical="center")

        # 1. संस्था व छात्र मेटाडाटा
        ws.merge_cells("A1:E1")
        ws["A1"] = "NISCHAY OMR PRO - EVALUATION REPORT"
        ws["A1"].font = Font(name="Calibri", size=14, bold=True, color="1E40AF")
        ws["A1"].alignment = center_align

        ws.append(["Student Name:", student_name, "", "Roll Number:", roll_no])
        ws.append([
            "Total Score:", f"{summary.get('score', 0)} / {summary.get('total_questions', len(details))}",
            "", "Percentage:", f"{summary.get('percentage', 0.0)}%"
        ])
        ws.append([])  # खाली पंक्ति

        # मेटाडाटा स्टाइलिंग
        for r in [2, 3]:
            ws[f"A{r}"].font = meta_font
            ws[f"D{r}"].font = meta_font

        # 2. मुख्य तालिका हेडर
        headers = ["Question", "Student Marked", "Answer Key", "Status", "Marks"]
        ws.append(headers)
        header_row_idx = ws.max_row

        for col_idx in range(1, 6):
            cell = ws.cell(row=header_row_idx, column=col_idx)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = center_align

        # 3. डेटा पंक्तियाँ
        for row in details:
            status = row.get("Status", "")
            q_num = row.get("Question", "")
            marked = row.get("Student_Marked", "")
            key = row.get("Answer_Key", "")
            marks = float(row.get("Marks", 0.0))

            ws.append([q_num, marked, key, status, marks])
            curr_row = ws.max_row

            # स्टेटस के अनुसार रंग
            status_cell = ws.cell(row=curr_row, column=4)
            if status == "सही":
                status_cell.font = Font(color="16A34A", bold=True)
            elif status == "गलत":
                status_cell.font = Font(color="DC2626", bold=True)
            elif status == "अमान्य":
                status_cell.font = Font(color="D97706", bold=True)

            for col_idx in range(1, 6):
                c = ws.cell(row=curr_row, column=col_idx)
                c.border = thin_border
                c.alignment = center_align

        # कॉलम की चौड़ाई ऑटो-एडजस्ट करना
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 14)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        filename = f"Nischay_OMR_{student_name.replace(' ', '_')}_{roll_no}.xlsx"

        return StreamingResponse(
            output,
            headers={'Content-Disposition': f'attachment; filename="{filename}"'},
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
