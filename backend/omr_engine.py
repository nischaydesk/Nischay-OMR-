import cv2
import numpy as np

def order_points(pts):
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def four_point_transform(image, pts):
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))

    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))

    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(image, M, (maxWidth, maxHeight))

def process_omr(image_bytes: bytes, answer_key: dict, total_questions: int = 20):
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("अमान्य इमेज फ़ाइल")

    orig_h, orig_w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 1. यदि बड़ी BSEB शीट है (100 सवाल)
    if orig_h > 1400 and orig_w > 900:
        th = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)[1]
        ROW_Y = [48.4, 79.6, 112.1, 145.7, 174.3, 205.0, 236.8, 267.3, 298.3, 329.8,
                 361.9, 393.9, 424.8, 455.9, 486.8, 519.4, 549.0, 579.3, 595.0, 609.8]
        COL_X_RANGES = [(331, 443), (491, 603), (651, 763), (811, 923), (971, 1083)]

        results = []
        correct, wrong, skipped, invalid = 0, 0, 0, 0
        col_count = int(np.ceil(total_questions / 20.0))

        for c_idx in range(min(col_count, len(COL_X_RANGES))):
            x1, x2 = COL_X_RANGES[c_idx]
            if x2 > orig_w: continue
            crop_col = th[826:1460, x1:x2]
            num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(crop_col)

            col_bubbles = []
            for i in range(1, num_labels):
                if stats[i, cv2.CC_STAT_AREA] >= 100 and stats[i, cv2.CC_STAT_WIDTH] < 30 and stats[i, cv2.CC_STAT_HEIGHT] < 30:
                    col_bubbles.append((centroids[i][1], centroids[i][0]))

            for r_idx, ry in enumerate(ROW_Y):
                q_num = c_idx * 20 + (r_idx + 1)
                if q_num > total_questions: break

                marked = []
                for b in col_bubbles:
                    if abs(b[0] - ry) < 14:
                        cx = b[1]
                        if cx < 28: marked.append('A')
                        elif cx < 56: marked.append('B')
                        elif cx < 83: marked.append('C')
                        else: marked.append('D')

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

                results.append({"Question": f"Q{q_num:02d}", "Student_Marked": ans, "Answer_Key": key, "Status": status, "Marks": mark})

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

    # 2. छोटी शीट या कस्टम शीट (20 प्रश्न / ऑटो-अलाइनमेंट मशीन मोड)
    # ऑटो-कॉन्टूरिंग से शीट का टेबल बॉर्डर ढूँढना
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 50, 200)

    contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    doc_cnt = None

    if contours:
        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        for c in contours:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4:
                doc_cnt = approx
                break

    if doc_cnt is not None:
        warped = four_point_transform(gray, doc_cnt.reshape(4, 2))
    else:
        warped = gray

    # स्टैण्डर्ड 800x600 ग्रिड में नॉर्मलाइज़ करना
    warped = cv2.resize(warped, (800, 600))
    th = cv2.threshold(warped, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

    # 20 प्रश्नों की शीट के दो कॉलम (बायाँ: Q1-10, दायाँ: Q11-20)
    # हेडर और बॉटम बॉर्डर छोड़कर सिर्फ़ डेटा एरिया
    data_area = th[110:570, :]
    dh, dw = data_area.shape

    cols = [
        (int(dw * 0.12), int(dw * 0.48), 1, 10),
        (int(dw * 0.54), int(dw * 0.90), 11, 20)
    ]

    results = []
    correct, wrong, skipped, invalid = 0, 0, 0, 0

    for x1, x2, q_start, q_end in cols:
        col_img = data_area[:, x1:x2]
        ch, cw = col_img.shape
        row_h = ch / 10.0

        for r in range(10):
            q_num = q_start + r
            if q_num > total_questions: break

            ry1 = int(r * row_h)
            ry2 = int((r + 1) * row_h)
            row_box = col_img[ry1:ry2, :]
            rb_h, rb_w = row_box.shape

            # दाएँ 80% में चार गोले (A, B, C, D)
            options_box = row_box[:, int(rb_w * 0.20):]
            _, ob_w = options_box.shape
            opt_w = ob_w / 4.0

            scores = []
            for opt_i in range(4):
                bx1 = int(opt_i * opt_w + (opt_w * 0.10))
                bx2 = int((opt_i + 1) * opt_w - (opt_w * 0.10))
                by1 = int(rb_h * 0.15)
                by2 = int(rb_h * 0.85)

                b_cell = options_box[by1:by2, bx1:bx2]
                fill_ratio = (cv2.countNonZero(b_cell) / float(b_cell.size)) * 100
                scores.append(fill_ratio)

            max_fill = max(scores)
            avg_fill = sum(scores) / 4.0

            # अगर सबसे गहरा गोला 30% से अधिक भरा हो और बाकी औसत से 15% अधिक हो
            marked_opts = []
            for i, score in enumerate(scores):
                if score > 35 and (score - avg_fill) > 12:
                    marked_opts.append(['A', 'B', 'C', 'D'][i])

            key = answer_key.get(q_num, '-')
            if len(marked_opts) == 0:
                status, ans, mark = "छोड़ा हुआ", "-", 0.0
                skipped += 1
            elif len(marked_opts) > 1:
                status, ans, mark = "अमान्य", ",".join(marked_opts), 0.0
                invalid += 1
            else:
                ans = marked_opts[0]
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
