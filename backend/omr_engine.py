import os
import json
import logging
from google import genai
from google.genai import types

# लॉगर कॉन्फ़िगरेशन
logger = logging.getLogger("omr_engine")

# Render Environment Variable से API Key स्वतः लोड होगी
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# प्राइमरी और बैकअप मॉडल की सूची
PRIMARY_MODEL = "gemini-3.8-flash"
BACKUP_MODEL = "gemini-3.5-flash-lite"

def process_omr(image_bytes: bytes, answer_key: dict, total_questions: int = 20):
    prompt = f"""
    You are an ultra-strict, high-speed OMR verification and evaluation system.

    STEP 1: OMR VALIDATION
    - Verify if this image is an actual OMR answer sheet containing bubble rows (A, B, C, D).
    - If it is a screenshot, terminal log, landscape photo, or not an OMR sheet, set "is_omr": false and stop.

    STEP 2: STRICT ROLL NUMBER EXTRACTION
    - Only read from explicit boxes labeled "ROLL NO", "ROLL NUMBER", "अनुक्रमांक", or "OMR NO".
    - Do NOT guess or pick random text from headers/logs. If absent or unclear, output "N/A".
    - Read CANDIDATE NAME if printed/written clearly, else output "STUDENT".

    STEP 3: EVALUATE BUBBLES
    - Detect filled/darkened bubbles for questions 1 to {total_questions}.
    - Ink darkened option = 'A', 'B', 'C', or 'D'.
    - Empty = "-". Multiple darkened = "INVALID".

    Return ONLY a pure valid JSON object without markdown formatting or backticks:
    {{
      "is_omr": true,
      "student_name": "PRINCE KUMAR",
      "roll_no": "2608493105",
      "answers": {{"1": "B", "2": "A", "3": "-", "4": "INVALID"}}
    }}
    OR if NOT an OMR sheet:
    {{
      "is_omr": false,
      "message": "यह वैध OMR शीट नहीं है। कृपया परीक्षा OMR उत्तर पत्रक की साफ़ फ़ोटो अपलोड करें।"
    }}
    """

    response = None
    selected_model_used = None
    last_error = None

    # प्राइमरी मॉडल से प्रयास, फ़ेल होने पर स्वतः बैकअप मॉडल पर स्विच
    for model_name in [PRIMARY_MODEL, BACKUP_MODEL]:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type="image/jpeg",
                    ),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.0
                )
            )
            if response and response.text:
                selected_model_used = model_name
                break
        except Exception as err:
            last_error = err
            logger.warning(f"{model_name} विफल हुआ, अगले मॉडल पर स्विच हो रहा है... त्रुटि: {err}")
            continue

    if not response or not response.text:
        raise ValueError(f"दोनों AI मॉडल से रिस्पॉन्स नहीं मिला: {str(last_error)}")

    # JSON पार्सिंग और संभावित मार्कडाउन क्लीनअप
    try:
        raw_text = response.text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1]
            if raw_text.endswith("```"):
                raw_text = raw_text.rsplit("\n", 1)[0]
        extracted_data = json.loads(raw_text.strip())
    except Exception as e:
        raise ValueError(f"AI JSON पार्स करने में त्रुटि: {str(e)}")

    # अगर OMR शीट नहीं है तो तुरंत फ़्रंटएंड को सूचित करें
    if not extracted_data.get("is_omr", True):
        return {
            "is_omr": False,
            "message": extracted_data.get("message", "यह OMR शीट नहीं है! कृपया सही OMR शीट अपलोड करें।")
        }

    student_name = extracted_data.get("student_name", "STUDENT").strip().upper()
    raw_roll = str(extracted_data.get("roll_no", "N/A")).strip().upper()
    roll_no = raw_roll if len(raw_roll) >= 3 and raw_roll != "N/A" else "N/A"
    answers_dict = extracted_data.get("answers", {})

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
        "percentage": round((correct / len(results)) * 100, 1) if results else 0.0,
        "engine_used": selected_model_used
    }

    return {
        "is_omr": True,
        "student_name": student_name,
        "roll_no": roll_no,
        "summary": summary,
        "details": results
    }
