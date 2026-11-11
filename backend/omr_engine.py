import cv2
import numpy as np

def order_points(pts):
    # 4 कोनों को सही क्रम में लगाना: top-left, top-right, bottom-right, bottom-left
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def four_point_transform(image, pts):
    # फोटो को सीधा (Deskew/Warp) करना
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
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    return warped

def get_option_char(idx):
    return ['A', 'B', 'C', 'D'][idx]

def process_omr(image_bytes: bytes, answer_key: dict, total_questions: int = 20):
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("अमान्य इमेज फ़ाइल")

    orig_h, orig_w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 1. क्या यह बिहार बोर्ड वाली बड़ी 100 सवालों की ऑफिशियल शीट है?
    if orig_h > 1400 and orig_w > 900:
        # स्टैंडर्ड बिहार बोर्ड कोऑर्डिनेट्स
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
                if stats[i, cv2.CC_STAT_AREA] >= 110 and stats[i, cv2.CC_STAT_WIDTH] < 28 and stats[i, cv2.CC_STAT_HEIGHT] < 28:
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

    # 2. यूनिवर्सल हैंडलर: कॉपी पर बने गोले, हाथ से खींची फोटो या छोटी शीट
    # इमेज को स्टैंडर्ड 800x1000 में रीसाइज करना
    resized = cv2.resize(gray, (800, 1000))
    blurred = cv2.GaussianBlur(resized, (5, 5), 0)
    thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

    # गोलों के मुख्य एरिया (कंटेनर) का अनुमान
    # ऊपर का 15% टाइटल छोड़ें, नीचे का 5% मार्जिन छोड़ें
    roi = thresh[150:950, 40:760]
    rh, rw = roi.shape

    results = []
    correct, wrong, skipped, invalid = 0, 0, 0, 0

    # क्या 20 सवाल 2 कॉलम में हैं (10-10) या 1 ही कॉलम में?
    is_two_col = (total_questions > 10)
    cols = 2 if is_two_col else 1
    rows_per_col = int(np.ceil(total_questions / float(cols)))

    col_width = rw / float(cols)
    row_height = rh / float(rows_per_col)

    for c in range(cols):
        for r in range(rows_per_col):
            q_num = c * rows_per_col + (r + 1)
            if q_num > total_questions: break

            # प्रश्न की पंक्ति काटना
            y1 = int(r * row_height)
            y2 = int((r + 1) * row_height)
            x1 = int(c * col_width)
            x2 = int((c + 1) * col_width)

            q_roi = roi[y1:y2, x1:x2]
            qh, qw = q_roi.shape

            # सवाल नंबर के लेबल को छोड़कर सिर्फ 4 गोलों (A, B, C, D) का क्षेत्र
            # आमतौर पर बाईं तरफ 25% में सवाल नंबर लिखा होता है
            opt_area = q_roi[:, int(qw * 0.22):]
            oh, ow = opt_area.shape
            opt_step = ow / 4.0

            bubble_scores = []
            for opt_idx in range(4):
                bx1 = int(opt_idx * opt_step + (opt_step * 0.15))
                bx2 = int((opt_idx + 1) * opt_step - (opt_step * 0.15))
                by1 = int(oh * 0.15)
                by2 = int(oh * 0.85)

                b_crop = opt_area[by1:by2, bx1:bx2]
                # भरे हुए पिक्सल (काली स्याही) की गिनती
                fill_pixels = cv2.countNonZero(b_crop)
                total_crop_pixels = b_crop.size if b_crop.size > 0 else 1
                density = (fill_pixels / float(total_crop_pixels)) * 100
                bubble_scores.append(density)

            # भरे हुए गोले का निर्धारण
            max_val = max(bubble_scores)
            avg_val = np.mean(bubble_scores)
            
            # अगर सबसे गहरा गोला बाकी गोलों से कम से कम 15% ज्यादा भरा हो और खुद 20% से ज्यादा भरा हो
            filled_opts = [get_option_char(i) for i, sc in enumerate(bubble_scores) if sc > 25 and (sc - avg_val) > 8]

            key = answer_key.get(q_num, '-')

            if len(filled_opts) == 0:
                status, ans, mark = "छोड़ा हुआ", "-", 0.0
                skipped += 1
            elif len(filled_opts) > 1:
                status, ans, mark = "अमान्य", ",".join(filled_opts), 0.0
                invalid += 1
            else:
                ans = filled_opts[0]
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
