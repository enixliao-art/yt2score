import requests

url = "https://i.ytimg.com/sb/d9IbTyrrYMc/storyboard3_L0/default.jpg?sqp=-oaymwENSDfyq4qpAwVwAcABBqLzl_8DBgj8vofRBg==&sigh=rs$AOn4CLCwgZ-4bx-c4Bi-UhyQUmWqKD6oiQ"
r = requests.get(url)
with open("storyboard_0.jpg", "wb") as f:
    f.write(r.content)
print("Storyboard saved, size:", len(r.content))