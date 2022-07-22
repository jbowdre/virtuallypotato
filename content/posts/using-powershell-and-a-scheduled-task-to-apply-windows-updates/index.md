---
series: Scripts
date: "2021-04-29T08:34:30Z"
usePageBundles: true
tags:
- windows
- powershell
title: Using PowerShell and a Scheduled Task to apply Windows Updates
toc: false
---

In the same vein as [my script to automagically resize a Linux LVM volume to use up free space on a disk](/automatic-unattended-expansion-of-linux-root-lvm-volume-to-fill-disk), I wanted a way to automatically apply Windows updates for servers deployed by [my vRealize Automation environment](/series/vra8). I'm only really concerned with Windows Server 2019, which includes the [built-in Windows Update Provider PowerShell module](https://4sysops.com/archives/scan-download-and-install-windows-updates-with-powershell/). So this could be as simple as `Install-WUUpdates -Updates (Start-WUScan)` to scan for and install any available updates.

Unfortunately, I found that this approach can take a long time to run and often exceeded the timeout limits imposed upon my ABX script, causing the PowerShell session to end and terminating the update process. I really needed a way to do this without requiring a persistent session. 

After further experimentation, I settled on using PowerShell to create a one-time scheduled task that would run the updates and reboot, if necessary. I also wanted the task to automatically delete itself after running to avoid cluttering up the task scheduler library - and that last item had me quite stumped until I found [this blog post with the solution](https://iamsupergeek.com/self-deleting-scheduled-task-via-powershell/).

So here's what I put together:
```powershell
# This can be easily pasted into a remote PowerShell session to automatically install any available updates and reboot. 
# It creates a scheduled task to start the update process after a one-minute delay so that you don't have to maintain
# the session during the process (or have the session timeout), and it also sets the task to automatically delete itself 2 hours later.
#
# This leverages the Windows Update Provider PowerShell module which is included in Windows 10 1709+ and Windows Server 2019.
# 
# Adapted from https://iamsupergeek.com/self-deleting-scheduled-task-via-powershell/

$action = New-ScheduledTaskAction -Execute 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe' -Argument '-NoProfile -WindowStyle Hidden -Command "& {Install-WUUpdates -Updates (Start-WUScan); if (Get-WUIsPendingReboot) {shutdown.exe /f /r /d p:2:4 /t 120 /c `"Rebooting to apply updates`"}}"'
$trigger = New-ScheduledTaskTrigger -Once -At ([DateTime]::Now.AddMinutes(1))
$settings = New-ScheduledTaskSettingsSet -Compatibility Win8 -Hidden
Register-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -TaskName "Initial_Updates" -User "NT AUTHORITY\SYSTEM" -RunLevel Highest
$task = Get-ScheduledTask -TaskName "Initial_Updates"
$task.Triggers[0].StartBoundary = [DateTime]::Now.AddMinutes(1).ToString("yyyy-MM-dd'T'HH:mm:ss")
$task.Triggers[0].EndBoundary = [DateTime]::Now.AddHours(2).ToString("yyyy-MM-dd'T'HH:mm:ss")
$task.Settings.AllowHardTerminate = $True
$task.Settings.DeleteExpiredTaskAfter = 'PT0S'
$task.Settings.ExecutionTimeLimit = 'PT2H'
$task.Settings.Volatile = $False
$task | Set-ScheduledTask
```

It creates the task, sets it to run in one minute, and then updates the task's configuration to make it auto-expire and delete two hours later. When triggered, the task installs all available updates and (if necessary) reboots the system after a 2-minute countdown (which an admin could cancel with `shutdown /a`, if needed). This could be handy for pasting in from a remote PowerShell session and works great when called from a vRA ABX script too!