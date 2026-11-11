import cv2
import numpy as np

ROW_Y = [
    48.4, 79.6, 112.1, 145.7, 174.3, 205.0, 236.8, 267.3, 298.3, 329.8,
    361.9, 393.9, 424.8, 455.9, 486.8, 519.4, 549.0, 579.3, 595.0, 609.8
]

COL_X_RANGES = [
    (331, 443),   # Col 1: Q01-Q20
    (491, 603),   # Col 2: Q21-Q40
    (651, 763),   # Col 3: Q41-Q60
    (811, 923),   # Col 4: Q61-Q80
    (971, 1083)   # Col 5: Q81-Q100
]

def get_option(cx):
    if cx < 28:
        return 'A'
    elif cx < 56:
        return 'B'
    elif cx < 83:
        return 'C'
    return 'D'

def process_omr(image_bytes: bytes, answer_key: dict, total_questions: int = 20):
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("अमान्य इमेज फ़ाइल")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    th = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)[1]

    results = []
    correct, wrong, skipped, invalid = 0, 0, 0, 0
    col_count = int(np.ceil(total_questions / 20.0))

    for c_idx in range(min(col_count, len(COL_X_RANGES))):
        x1, x2 = COL_X_RANGES[c_idx]
        if x2 > img.shape[1]:
            continue

        crop_col = th[826:1460, x1:x2]
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(crop_col)

        col_bubbles = []
        for i in range(1, num_labels):
            area = stats[i, cv2.CC_STAT_AREA]
            w = stats[i, cv2.CC_STAT_WIDTH]
            h = stats[i, cv2.CC_STAT_HEIGHT]
            cx, cy = centroids[i]
            # बॉर्डर लाइन फ़िल्टरिंग और ठोस भरा गोला
            if area >= 120 and w < 25 and h < 25:
                col_bubbles.append((cy, cx))

        for r_idx, ry in enumerate(ROW_Y):
            q_num = c_idx * 20 + (r_idx + 1)
            if q_num > total_questions:
                break

            marked = [get_option(b[1]) for b in col_bubbles if abs(b[0] - ry) < 14]
            key = answer_key.get(q_num, '-')

            if len(marked) == 0:
                status, ans, mark = "छोड़ा हुआ", "-", 0.0
                skipped += 1
            elif len(marked) > 1:
                status, ans, mark = "अमान्य", ",".join(marked), 0.0
                invalid += 1
            else:
                ans = marked[0]
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

    return {"summary": summary, "details": results}
