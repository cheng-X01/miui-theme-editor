; NSIS 安装脚本扩展 - Windows 安装程序自定义配置
; 用于 electron-builder 的 NSIS 安装器，添加桌面快捷方式等自定义功能

!macro customInstall
  ; 创建桌面快捷方式
  CreateShortcut "$DESKTOP\MIUI Theme Editor.lnk" "$INSTDIR\MIUI Theme Editor.exe" "" "$INSTDIR\MIUI Theme Editor.exe" 0
!macroend

!macro customUnInstall
  ; 卸载时删除桌面快捷方式
  Delete "$DESKTOP\MIUI Theme Editor.lnk"
!macroend
