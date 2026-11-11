import os
import json
import time
from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

def process_omr(image_bytes: bytes, answer_key: dict, total_questions: int = 20):
    prompt = f"""
    You are an ultra-strict OMR verification and evaluation system.

    STEP 1: OMR VALIDATION (MANDATORY)
    - Check if this image is actually an OMR (Optical Mark Recognition) answer sheet containing a numbered bubble grid (A, B, C, D).
    - If the image is a screenshot, random picture, document, code, or anything OTHER than an OMR sheet, set "is_omr": false immediately and leave other fields empty.

    STEP 2: STRICT ROLL NUMBER DETECTION
    - Do NOT guess or take random text from headers/logs/URLs.
    - Look EXCLUSIVELY for labels like "ROLL NO", "ROLL NUMBER", "अनुक्रमांक", "OMR NO", or a dedicated numeric barcode box.
    - If no such labeled box exists or it does not contain a roll number, output "N/A".

    STEP 3: BUBBLE SCANNING (Only if is_omr is true)
    - Scan darkened circles for Q1 to Q{total_questions}.
    - Ink filled = letter (A, B, C, D). Empty = "-". Multiple = "INVALID".

    Return ONLY pure JSON without markdown or backticks:
    {{
      "is_omr": true,
      "student_name": "STUDENT",
      "roll_no": "N/A",
      "answers": {{"1": "A", "2": "B"}}
    }}
    OR if NOT an OMR sheet:
    {{
      "is_omr": false,
      "message": "यह वैध OMR शीट नहीं है। कृपया परीक्षा OMR उत्तर पत्रक की साफ़ फ़ोटो अपलोड करें।"
    }}
    """

    response = None
    for attempt in range(1, 3):
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.0
                )
            )
            if response and response.text:
                break
        except Exception:
            time.sleep(1.0)

    if not response or not response.text:
        raise ValueError("सर्वर से संपर्क नहीं हो सका।")

    try:
        raw_text = response.text.strip()
        if "```" in raw_text:
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
        data = json.loads(raw_text.strip())
    except Exception as e:
        raise ValueError("डेटा पार्स करने में त्रुटि आई।")

    # यदि इमेज OMR नहीं है
    if not data.get("is_omr", True):
        return {
            "is_omr": False,
            "message": data.get("message", "यह OMR शीट नहीं है! कृपया सही OMR शीट अपलोड करें।")
        }

    student_name = data.get("student_name", "STUDENT").strip().upper()
    raw_roll = str(data.get("roll_no", "N/A")).strip().upper()

    # सख्त रोल नंबर फ़िल्टर: अगर 3 अक्षर से कम या अमान्य सिंबल हों तो N/A
    roll_no = raw_roll if len(raw_roll) >= 3 and raw_roll != "N/A" else "N/A"

    answers_dict = data.get("answers", {})
    results = []
    correct, wrong, skipped, invalid = 0, 0, 0, 0

    for q_num in range(1, total_questions + 1):
        detected_val = answers_dict.get(str(q_num), "-").strip().upper()
        key = answer_key.get(q_num, answer_key.get(str(q_num), '-'))

        if detected_val in ["-", "", "NONE", "SKIPPED"]:
            status, ans, mark = "छोड़ा हुआ", "-", 0.0
            skipped += 1
        elif detected_val in ["INVALID", "MULTIPLE"] or len(detected_val) > 1:
            status, ans, mark = "अमान्य", detected_val, 0.0
            invalid += 1
        else:
            ans = detected_val
            if key != '-' and ans == key:
                status, mark = "सही", 1.0
                correct += 1
            elif key == '-':
                status, mark = "की उपलब्ध नहीं", 0.0
                skipped += 1
            else:
                status, mark = "गलत", 0.0
                wrong += 1

        results.append({
            "Question": f"Q{q_num:02d}",
            "Student_Marked": ans,
            "Answer_Key": key,
            "Status": status,
            "Marks": mark
        })

    summary = {
        "total_questions": len(results),
        "correct": correct,
        "wrong": wrong,
        "skipped": skipped,
        "invalid": invalid,
        "score": correct,
        "percentage": round((correct / len(results)) * 100, 1) if results else 0.0
    }

    return {
        "is_omr": True,
        "student_name": student_name,
        "roll_no": roll_no,
        "summary": summary,
        "details": results
    }
