import os
import json
import time
from google import genai
from google.genai import types

# एनवायरनमेंट वेरिएबल से API Key स्वतः लोड होगी
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

def process_omr(image_bytes: bytes, answer_key: dict, total_questions: int = 20):
    prompt = f"""
    You are an expert high-accuracy OMR grading scanner and OCR extraction engine.
    Analyze the uploaded OMR sheet image carefully and perform two tasks:

    TASK 1: EXTRACT STUDENT CREDENTIALS
    - Read the candidate's handwritten or printed name from the CANDIDATE NAME field. If not present or illegible, use "STUDENT".
    - Read the ROLL NUMBER from the text box or filled bubbles. If not present or illegible, use "N/A".

    TASK 2: EVALUATE OMR BUBBLES
    - Detect the marked (filled/darkened) bubble for each question number from 1 to {total_questions}.
    - Allowed options are 'A', 'B', 'C', or 'D'.
    - If a bubble is clearly filled or darkened, output that letter.
    - If no bubble is filled for a question, output "-".
    - If multiple bubbles are filled for the same question, output "INVALID".

    Return ONLY a valid JSON object without markdown, formatting or backticks. Format exactly as:
    {{
      "student_name": "PRINCE KUMAR",
      "roll_no": "2608493105",
      "answers": {{"1": "B", "2": "A", "3": "-", "4": "INVALID"}}
    }}
    """

    response = None
    last_exception = None

    # 503 UNAVAILABLE व ट्रैफिक स्पाइक्स से बचाव हेतु 3 बार ऑटो-रीट्राई
    for attempt in range(1, 4):
        try:
            response = client.models.generate_content(
                model='gemini-3.5-flash-lite',
                contents=[
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type="image/jpeg",
                    ),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            if response and response.text:
                break
        except Exception as e:
            last_exception = e
            # प्रत्येक प्रयास के बाद थोड़ा रुककर पुनः प्रयास (1.5s, 3.0s)
            time.sleep(attempt * 1.5)

    if not response or not response.text:
        err_msg = str(last_exception) if last_exception else "कोई रिस्पॉन्स प्राप्त नहीं हुआ"
        raise ValueError(f"AI विज़न स्कैनिंग में लोड अधिक है। पुनः प्रयास विफल: {err_msg}")

    # JSON पार्सिंग और संभावित मार्कडाउन क्लीनअप
    try:
        raw_text = response.text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1]
            if raw_text.endswith("```"):
                raw_text = raw_text.rsplit("\n", 1)[0]
        extracted_data = json.loads(raw_text.strip())
    except Exception as e:
        raise ValueError(f"AI रिस्पॉन्स JSON पार्स करने में त्रुटि: {str(e)}")

    student_name = extracted_data.get("student_name", "STUDENT").strip().upper()
    roll_no = str(extracted_data.get("roll_no", "N/A")).strip().upper()
    answers_dict = extracted_data.get("answers", {})

    results = []
    correct, wrong, skipped, invalid = 0, 0, 0, 0

    for q_num in range(1, total_questions + 1):
        detected_val = answers_dict.get(str(q_num), "-").strip().upper()
        key = answer_key.get(q_num, '-')

        if detected_val in ["-", "", "NONE", "SKIPPED"]:
            status, ans, mark = "छोड़ा हुआ", "-", 0.0
            skipped += 1
        elif detected_val in ["INVALID", "MULTIPLE"] or len(detected_val) > 1:
            status, ans, mark = "अमान्य", detected_val, 0.0
            invalid += 1
        else:
            ans = detected_val
            if ans == key:
                status, mark = "सही", 1.0
                correct += 1
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
        "student_name": student_name,
        "roll_no": roll_no,
        "summary": summary,
        "details": results
    }
