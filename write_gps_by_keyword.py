# write_gps_by_keyword.py
# 사용법:
#   1) 이 파일을 프로젝트 루트(converted 폴더와 같은 위치)에 저장
#   2) pip install piexif pillow
#   3) python write_gps_by_keyword.py
#
# 동작:
#   - 키워드별(GPS 좌표 하드코딩)로 표에 있는 파일명 51개를 converted/에서 찾아
#     EXIF GPS를 기록하고, 성공하면 파일명 앞에 GPS_를 붙입니다.

import os
import piexif
from fractions import Fraction

# ===== 1) 키워드 → GPS(DMS 문자열) 값 하드코딩 =====
GPS_PRESETS = {
    "말": {
        "lat_dms": "47; 51; 57.2300000000103637",
        "lon_dms": "107; 22; 48.869999999999952439",
        "alt":     1538.94829760403,
    },
    "독수리": {
        "lat_dms": "47; 48; 41.0299999999986653",
        "lon_dms": "107; 19; 41.4099999999999744",
        "alt":     1447.118956743,
    },
    "낙타": {
        "lat_dms": "47; 20; 0.869999999995414441",
        "lon_dms": "103; 40; 31.6900000000023851",
        "alt":     1247.47854356306,
    },
    "사원": {
        "lat_dms": "47; 56; 7.57000000000701334",
        "lon_dms": "107; 25; 38.6599999999974346",
        "alt":     1736.66182572614,
    },
    "울란바토르": {
        "lat_dms": "47; 54; 45.6799999999931572",
        "lon_dms": "106; 55; 48.0800000000161276",
        "alt":     1299.85710922787,
    },
}

# ===== 2) 파일명 → 키워드 (표의 51개) =====
FILE_KEYWORD_LIST = [
    ("89.JPG", "말"),
    ("316.JPG", "독수리"),
    ("310.JPG", "낙타"), ("308.JPG", "낙타"), ("306.JPG", "낙타"), ("304.JPG", "낙타"),
    ("302.JPG", "낙타"), ("300.JPG", "낙타"), ("296.JPG", "낙타"), ("294.JPG", "낙타"),
    ("292.JPG", "낙타"), ("290.JPG", "낙타"), ("288.JPG", "낙타"), ("286.JPG", "낙타"),
    ("284.JPG", "낙타"), ("282.JPG", "낙타"), ("280.JPG", "낙타"), ("278.JPG", "낙타"),
    ("274.JPG", "낙타"), ("272.JPG", "낙타"), ("270.JPG", "낙타"), ("268.JPG", "낙타"),
    ("266.JPG", "낙타"), ("264.JPG", "낙타"), ("262.JPG", "낙타"), ("260.JPG", "낙타"),
    ("258.JPG", "낙타"), ("256.JPG", "낙타"),
    ("248.JPG", "말"), ("246.JPG", "말"), ("244.JPG", "말"), ("242.JPG", "말"),
    ("240.JPG", "말"), ("238.JPG", "말"), ("236.JPG", "말"), ("234.JPG", "말"),
    ("230.JPG", "말"), ("225.JPG", "말"), ("213.JPG", "말"), ("201.JPG", "말"),
    ("189.JPG", "말"), ("177.JPG", "말"), ("165.JPG", "말"), ("153.JPG", "말"),
    ("141.JPG", "말"), ("129.JPG", "말"),
    ("127.JPG", "사원"),
    ("125.JPG", "울란바토르"),
    ("113.JPG", "말"), ("101.JPG", "말"),
    ("1.JPG",   "울란바토르"),
]

# ===== 유틸: DMS 문자열 → 십진수, 그리고 EXIF 분수 튜플 =====
def dms_to_decimal(dms_str: str) -> float:
    parts = [float(x.strip()) for x in dms_str.split(";")]
    if len(parts) != 3:
        raise ValueError(f"DMS 형식 오류: {dms_str}")
    deg, minute, sec = parts
    return deg + (minute / 60.0) + (sec / 3600.0)

def decimal_to_dms_rational(decimal_val: float):
    """ 소수 → EXIF용 (deg, min, sec) 분수 튜플 """
    decimal_val = abs(decimal_val)
    deg = int(decimal_val)
    minute_full = (decimal_val - deg) * 60
    minute = int(minute_full)
    sec = (minute_full - minute) * 60

    # 초를 소수로 최대한 보존 (1/10000 정밀도)
    return (
        (deg, 1),
        (minute, 1),
        (int(round(sec * 10000)), 10000)
    )

def write_gps_to_exif(filepath: str, lat_dms: str, lon_dms: str, altitude: float):
    # DMS → 소수
    lat = dms_to_decimal(lat_dms)
    lon = dms_to_decimal(lon_dms)

    lat_ref = "N" if lat >= 0 else "S"
    lon_ref = "E" if lon >= 0 else "W"

    lat_dms_frac = decimal_to_dms_rational(lat)
    lon_dms_frac = decimal_to_dms_rational(lon)

    # 고도: (분자, 분모) 정밀도 유지
    alt_frac = Fraction(int(round(altitude * 100)), 100)

    # 기존 EXIF 읽기(없어도 안전)
    try:
        exif_dict = piexif.load(filepath)
    except Exception:
        exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": None}

    gps_ifd = {
        piexif.GPSIFD.GPSLatitudeRef: lat_ref,
        piexif.GPSIFD.GPSLatitude:    lat_dms_frac,
        piexif.GPSIFD.GPSLongitudeRef: lon_ref,
        piexif.GPSIFD.GPSLongitude:   lon_dms_frac,
        piexif.GPSIFD.GPSAltitudeRef: 0,  # 0=해수면 위, 1=해수면 아래
        piexif.GPSIFD.GPSAltitude:    (alt_frac.numerator, alt_frac.denominator),
    }

    exif_dict["GPS"] = gps_ifd
    exif_bytes = piexif.dump(exif_dict)
    piexif.insert(exif_bytes, filepath)

def ensure_gps_prefix(path: str):
    folder, fname = os.path.split(path)
    if fname.startswith("GPS_"):
        return path
    new_path = os.path.join(folder, "GPS_" + fname)
    # 충돌 방지
    counter = 1
    base, ext = os.path.splitext(new_path)
    while os.path.exists(new_path):
        new_path = f"{base}({counter}){ext}"
        counter += 1
    os.rename(path, new_path)
    return new_path

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    converted_dir = os.path.join(base_dir, "converted")

    if not os.path.isdir(converted_dir):
        print(f"❌ 'converted' 폴더가 없습니다: {converted_dir}")
        return

    # 파일명 대소문자/확장자 변형 대응을 위해 인덱스 구축
    # (예: 89.jpg, 89.JPG 모두 찾도록)
    index = {}
    for fn in os.listdir(converted_dir):
        lf = fn.lower()
        index[lf] = fn

    success, fail = 0, 0

    for filename, keyword in FILE_KEYWORD_LIST:
        preset = GPS_PRESETS.get(keyword)
        if not preset:
            print(f"⚠️ 키워드 미정의: {keyword} (파일: {filename})")
            fail += 1
            continue

        # 실제 파일명 찾기 (대소문자 무시)
        candidates = [
            filename,
            filename.replace(".JPG", ".jpg"),
            filename.replace(".JPG", ".jpeg"),
            filename.replace(".JPG", ".JPEG"),
        ]
        real_name = None
        for c in candidates:
            if c.lower() in index:
                real_name = index[c.lower()]
                break

        if not real_name:
            print(f"❌ 파일을 찾을 수 없습니다: {filename}")
            fail += 1
            continue

        path = os.path.join(converted_dir, real_name)

        try:
            write_gps_to_exif(
                path,
                preset["lat_dms"],
                preset["lon_dms"],
                float(preset["alt"]),
            )
            new_path = ensure_gps_prefix(path)
            print(f"✅ 완료: {real_name} → {os.path.basename(new_path)}  (키워드: {keyword})")
            success += 1
        except Exception as e:
            print(f"💥 실패: {real_name} (키워드: {keyword}) → {e}")
            fail += 1

    print("\n=== 요약 ===")
    print(f"성공: {success}개")
    print(f"실패: {fail}개")

if __name__ == "__main__":
    main()
