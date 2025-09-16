import os
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
converted_dir = os.path.join(BASE_DIR, "converted")

def has_gps_info(img_path):
    try:
        img = Image.open(img_path)
        exif_data = img._getexif()
        if not exif_data:
            return False

        # EXIF 태그를 해석
        for tag_id, value in exif_data.items():
            tag = TAGS.get(tag_id, tag_id)
            if tag == "GPSInfo":
                return True
        return False
    except Exception as e:
        print(f"EXIF 확인 실패: {img_path} ({e})")
        return False

# JPG 파일만 확인
for filename in os.listdir(converted_dir):
    if filename.lower().endswith(".jpg"):
        file_path = os.path.join(converted_dir, filename)

        if has_gps_info(file_path):
            # 이미 GPS로 시작하지 않는 경우만 붙이기
            if not filename.startswith("GPS"):
                new_name = "GPS_" + filename
                new_path = os.path.join(converted_dir, new_name)
                
                # 이름 충돌 방지
                if os.path.exists(new_path):
                    os.remove(new_path)
                
                os.rename(file_path, new_path)
                print(f"{filename} -> {new_name}")
        else:
            print(f"{filename} : GPS 정보 없음")

print("GPS 태그 붙이기 완료!")
