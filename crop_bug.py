import cv2

# 切出左下角 Scorebug 區域放大檢視
img = cv2.imread("storyboard_high_0.jpg")
# 第 3 列第 2 欄 (y: 360~540, x: 320~640)
sub = img[360:540, 320:640]
# 裁出 scorebug (位於左上方)
bug = sub[10:90, 10:240]
cv2.imwrite("scorebug_sample.jpg", bug)
cv2.imwrite("subframe_sample.jpg", sub)
print("Saved scorebug_sample.jpg!")