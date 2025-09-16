import os
from PIL import Image
from PIL.ExifTags import TAGS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
converted_dir = os.path.join(BASE_DIR, "converted")

def has_gps_info(img_path):
    try:
        img = Image.open(img_path)
        exif_data = img._getexif()
        if not exif_data:
            return False

        for tag_id, value in exif_data.items():
            tag = TAGS.get(tag_id, tag_id)
            if tag == "GPSInfo":
                return True
        return False
    except Exception as e:
        print(f"EXIF 확인 실패: {img_path} ({e})")
        return False

# JPG만 확인
print("GPS 정보 없는 파일 목록:")
for filename in os.listdir(converted_dir):
    if filename.lower().endswith(".jpg"):
        file_path = os.path.join(converted_dir, filename)

        if not has_gps_info(file_path):
            print(filename)
