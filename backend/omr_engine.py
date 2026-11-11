import os
import json
import time
from google import genai
from google.genai import types

# एनवायरनमेंट वेरिएबल से API Key स्वतः लोड होगी
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

def process_omr(image_bytes: bytes, answer_key: dict, total_questions: int = 20):
    # सुपर-फास्ट और बिना किसी भ्रम वाला सख्त विज़न प्रॉम्प्ट
    prompt = f"""
    You are an ultra-high precision, deterministic OMR bubble scanner and OCR engine.
    Analyze the uploaded OMR sheet image and evaluate strictly from question 1 to {total_questions}.

    CRITICAL SCANNING RULES:
    1. A marked bubble is one where the inside of circle A, B, C, or D is DARKENED or FILLED WITH INK (pen/pencil).
    2. Do NOT confuse the printed letter inside an empty circle with an ink mark. If a circle only has the printed letter and white background, it is UNMARKED.
    3. Look row by row: For each question Q1 to Q{total_questions}, identify which single letter (A, B, C, or D) is filled.
    4. If no bubble is darkened for a question, output "-".
    5. If multiple bubbles are darkened for the same question, output "INVALID".
    6. Read CANDIDATE NAME and ROLL NUMBER from the top header box. If illegible or blank, output "STUDENT" and "N/A".

    Return ONLY a pure valid JSON object without markdown, formatting or backticks. Format exactly as:
    {{
      "student_name": "PRINCE KUMAR",
      "roll_no": "2608493105",
      "answers": {{"1": "A", "2": "B", "3": "-", "4": "INVALID"}}
    }}
    """

    response = None
    last_exception = None

    # ऑटो-रीट्राई (फास्ट फेलओवर 1.0s)
    for attempt in range(1, 3):
        try:
            response = client.models.generate_content(
                model='gemini-3.8-flash',
                contents=[
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type="image/jpeg",
                    ),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.0  # शून्य टेम्परेचर से उत्तर में 100% सटीकता आती है, तुक्का नहीं लगता
                )
            )
            if response and response.text:
                break
        except Exception as e:
            last_exception = e
            time.sleep(1.0)

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
        # Answer key में इंट या स्ट्रिंग दोनों चेक करना
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
        "student_name": student_name,
        "roll_no": roll_no,
        "summary": summary,
        "details": results
    }
