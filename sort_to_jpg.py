import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
converted_dir = os.path.join(BASE_DIR, "converted")

# 변환할 확장자들
valid_exts = (".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG")

# converted 폴더 안에서 파일만 추출
files = [f for f in os.listdir(converted_dir) 
         if f.lower().endswith(valid_exts)]

# 이름 순서대로 정렬
files.sort()

# 순서대로 1부터 새로 이름 붙이기
for i, filename in enumerate(files, start=1):
    old_path = os.path.join(converted_dir, filename)
    new_name = f"{i}.JPG"  # 확장자 통일
    new_path = os.path.join(converted_dir, new_name)

    # 이름 충돌 방지: 이미 있으면 먼저 삭제
    if os.path.exists(new_path):
        os.remove(new_path)

    os.rename(old_path, new_path)
    print(f"{filename} -> {new_name}")

print("모든 파일 이름 정렬 및 확장자 통일 완료!")
