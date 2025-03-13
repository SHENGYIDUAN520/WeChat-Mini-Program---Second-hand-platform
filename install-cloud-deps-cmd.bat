@echo off
echo 正在为云函数安装依赖...

cd cloudfunctions\getReviews
echo 正在安装 getReviews 依赖...
cmd /c npm install
cd ..\..

cd cloudfunctions\submitReview
echo 正在安装 submitReview 依赖...
cmd /c npm install
cd ..\..

cd cloudfunctions\checkReview
echo 正在安装 checkReview 依赖...
cmd /c npm install
cd ..\..

cd cloudfunctions\getMessages
echo 正在安装 getMessages 依赖...
cmd /c npm install
cd ..\..

cd cloudfunctions\getMessageList
echo 正在安装 getMessageList 依赖...
cmd /c npm install
cd ..\..

cd cloudfunctions\sendMessage
echo 正在安装 sendMessage 依赖...
cmd /c npm install
cd ..\..

cd cloudfunctions\markMessagesAsRead
echo 正在安装 markMessagesAsRead 依赖...
cmd /c npm install
cd ..\..

echo 依赖安装完成！
echo 请在微信开发者工具中重新上传这些云函数。
pause 