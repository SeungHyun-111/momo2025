import os
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
input_dir = os.path.join(BASE_DIR, "image")
output_dir = os.path.join(BASE_DIR, "converted")

os.makedirs(output_dir, exist_ok=True)

for filename in os.listdir(input_dir):
    if filename.lower().endswith((".jpg", ".jpeg", ".png")):  # PNG 추가
        src_path = os.path.join(input_dir, filename)
        dst_path = os.path.join(output_dir, filename)

        # 이름 충돌 처리 → 앞에 "1_" 추가
        while os.path.exists(dst_path):
            dst_name = "1_" + os.path.basename(dst_path)
            dst_path = os.path.join(output_dir, dst_name)

        shutil.move(src_path, dst_path)
        print(f"Moved: {filename} -> {os.path.basename(dst_path)}")

print("모든 JPG/JPEG/PNG 파일 이동 완료!")
