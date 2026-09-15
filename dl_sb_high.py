import requests

# 下載清晰度最高的 storyboard (320x180 拼貼)
url = "https://i.ytimg.com/sb/d9IbTyrrYMc/storyboard3_L3/M0.jpg?sqp=-oaymwENSDfyq4qpAwVwAcABBqLzl_8DBgj8vofRBg==&sigh=rs$AOn4CLAf4Ywafa_Nc-no1iqhzJIHB-6epQ"
r = requests.get(url)
with open("storyboard_high_0.jpg", "wb") as f:
    f.write(r.content)
print("Saved storyboard_high_0.jpg, size:", len(r.content))