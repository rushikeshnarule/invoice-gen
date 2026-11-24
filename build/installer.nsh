!macro customInit
  ; Terminate any existing running instances of Invoice Gen to prevent file lock errors
  DetailPrint "Closing existing Invoice Gen processes..."
  nsExec::Exec 'cmd.exe /c taskkill /f /t /im "Invoice Gen.exe"'
  nsExec::Exec 'cmd.exe /c taskkill /f /t /im "Invoice Gen US Edition.exe"'
  Sleep 1000
!macroend

!macro customUnInit
  ; Terminate running instances before uninstall
  DetailPrint "Closing existing Invoice Gen processes..."
  nsExec::Exec 'cmd.exe /c taskkill /f /t /im "Invoice Gen.exe"'
  nsExec::Exec 'cmd.exe /c taskkill /f /t /im "Invoice Gen US Edition.exe"'
  Sleep 1000
!macroend
