import os
import piexif
from PIL import Image
import pillow_heif
import csv

# 현재 파일 기준 루트 디렉토리
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 입력/출력 경로
input_dir = os.path.join(BASE_DIR, "image")
output_dir = os.path.join(BASE_DIR, "converted")
os.makedirs(output_dir, exist_ok=True)

def get_decimal_from_dms(dms, ref):
    degrees = dms[0][0] / dms[0][1]
    minutes = dms[1][0] / dms[1][1]
    seconds = dms[2][0] / dms[2][1]
    decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
    if ref in ['S', 'W']:
        decimal = -decimal
    return decimal

def extract_gps(exif_dict):
    gps_info = exif_dict.get("GPS", {})
    if not gps_info:
        return None, None
    lat = gps_info.get(piexif.GPSIFD.GPSLatitude)
    lat_ref = gps_info.get(piexif.GPSIFD.GPSLatitudeRef)
    lon = gps_info.get(piexif.GPSIFD.GPSLongitude)
    lon_ref = gps_info.get(piexif.GPSIFD.GPSLongitudeRef)

    if lat and lon and lat_ref and lon_ref:
        latitude = get_decimal_from_dms(lat, lat_ref.decode())
        longitude = get_decimal_from_dms(lon, lon_ref.decode())
        return latitude, longitude
    return None, None

results = []

for filename in os.listdir(input_dir):
    if filename.lower().endswith(".heic"):
        heic_path = os.path.join(input_dir, filename)
        base_name = os.path.splitext(filename)[0]
        jpg_name = base_name + ".jpg"
        output_path = os.path.join(output_dir, jpg_name)

        counter = 1
        while os.path.exists(output_path):
            jpg_name = f"{base_name}_{counter}.jpg"
            output_path = os.path.join(output_dir, jpg_name)
            counter += 1

        # HEIC 열기 및 변환
        heif_file = pillow_heif.open_heif(heic_path, convert_hdr_to_8bit=True)
        image = Image.frombytes(
            heif_file.mode, heif_file.size, heif_file.data, "raw"
        )

        exif_bytes = heif_file.info.get("exif", b"")
        if exif_bytes:
            exif_dict = piexif.load(exif_bytes)
            lat, lon = extract_gps(exif_dict)
            image.save(output_path, "JPEG", exif=exif_bytes)
        else:
            lat, lon = None, None
            image.save(output_path, "JPEG")

        results.append({
            "filename": jpg_name,
            "original": filename,
            "has_gps": lat is not None and lon is not None,
            "latitude": lat,
            "longitude": lon,
            "output_path": output_path
        })

# CSV 저장 (converted 폴더 안에)
csv_path = os.path.join(output_dir, "results.csv")
with open(csv_path, "w", newline="", encoding="utf-8") as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=["filename", "original", "has_gps", "latitude", "longitude", "output_path"])
    writer.writeheader()
    writer.writerows(results)

print(f"변환 완료! 결과는 {output_dir} 안에 저장되었습니다.")
print(f"CSV 요약: {csv_path}")

