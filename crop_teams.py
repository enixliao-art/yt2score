import cv2

# 切出左上角隊名部分放大 3 倍
img = cv2.imread("storyboard_high_1.jpg")
sub = img[0:180, 0:320]
bug = sub[10:55, 10:95]
bug_large = cv2.resize(bug, (0, 0), fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
cv2.imwrite("team_names_large.jpg", bug_large)
print("Saved team_names_large.jpg!")