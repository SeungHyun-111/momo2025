import json, os
from PIL import Image, ExifTags

# 입력 파일들
photos_list_file = "photos_list_utf8.txt"   # 그룹 매핑용
output_file = "js/photos.js"                # 결과 저장

# ---------------------------
# 1. 파일명 → 그룹명 매핑
# ---------------------------
mapping = {}
with open(photos_list_file, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        parts = line.split("\\")
        if len(parts) < 2:
            continue
        folder = parts[-2]     # 그룹명
        filename = parts[-1]   # 파일명
        mapping[filename] = folder

# ---------------------------
# 2. EXIF 태그 ID 준비
# ---------------------------
TAGS = {v: k for k, v in ExifTags.TAGS.items()}
GPS_TAG_ID = TAGS.get("GPSInfo")
DTO_TAG_ID = TAGS.get("DateTimeOriginal")

def _to_deg(value):
    def _part(x):
        if hasattr(x, "numerator") and hasattr(x, "denominator"):
            return float(x.numerator) / float(x.denominator)
        if isinstance(x, tuple) and len(x) == 2:
            return float(x[0]) / float(x[1])
        return float(x)
    d = _part(value[0]); m = _part(value[1]); s = _part(value[2])
    return d + (m/60.0) + (s/3600.0)

def parse_gps(gps_ifd):
    if not gps_ifd:
        return None, None, None
    try:
        lat = _to_deg(gps_ifd.get(2)) if gps_ifd.get(2) else None
        if lat is not None and gps_ifd.get(1, "N") in ["S", "s"]:
            lat = -lat

        lon = _to_deg(gps_ifd.get(4)) if gps_ifd.get(4) else None
        if lon is not None and gps_ifd.get(3, "E") in ["W", "w"]:
            lon = -lon

        alt = None
        if 6 in gps_ifd:
            alt_raw = gps_ifd[6]
            if isinstance(alt_raw, tuple) and len(alt_raw) == 2:
                alt = float(alt_raw[0]) / float(alt_raw[1])
            else:
                try:
                    alt = float(alt_raw.numerator) / float(alt_raw.denominator)
                except Exception:
                    alt = float(alt_raw)
        return lat, lon, alt
    except Exception:
        return None, None, None

# ---------------------------
# 3. 이미지 순회 + EXIF 추출
# ---------------------------
photos_data = []
for root, _, files in os.walk("image/converted"):
    for fname in sorted(files):   # 파일명 기준 정렬 (참조 일관성 유지)
        if not fname.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        src = os.path.join(root, fname).replace("\\", "/")

        dto, lat, lon, alt = "", None, None, None
        try:
            with Image.open(src) as im:
                exif = im._getexif() or {}
                if DTO_TAG_ID in exif:
                    dto = str(exif[DTO_TAG_ID])
                gps_ifd = exif.get(GPS_TAG_ID)
                if gps_ifd:
                    lat, lon, alt = parse_gps(gps_ifd)
        except Exception:
            pass

        photos_data.append({
            "SourceFile": src,
            "FileName": fname,
            "DateTimeOriginal": dto,
            "GPSLatitude": lat,
            "GPSLongitude": lon,
            "GPSAltitude": alt,
            "Group": mapping.get(fname, "")
        })

# ---------------------------
# 4. 결과 저장
# ---------------------------
with open(output_file, "w", encoding="utf-8") as f:
    f.write("const photos = \n")
    json.dump(photos_data, f, ensure_ascii=False, indent=2)
    f.write(";\n")

print(f"✅ {output_file} 생성 완료 (EXIF + Group 포함)")
