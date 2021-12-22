---
date: "2020-10-07T08:34:30Z"
thumbnail: MnmMuA0HC.png
usePageBundles: true
tags:
- windows
- linux
- wsl
- vpn
title: Fixing WSL2 connectivity when connected to a VPN with wsl-vpnkit
toc: false
---

I was pretty excited to get [WSL2 and Docker working on my Windows 10 1909](/docker-on-windows-10-with-wsl2) laptop a few weeks ago, but I quickly encountered a problem: WSL2 had no network connectivity when connected to my work VPN. 

Well, that's not *entirely* true; Docker worked just fine, but nothing else could talk to anything outside of the WSL environment. I found a few open issues for this problem in the [WSL2 Github](https://github.com/microsoft/WSL/issues?q=is%3Aissue+is%3Aopen+VPN) with suggested workarounds including modifying Windows registry entries, adjusting the metrics assigned to various virtual network interfaces within Windows, and manually setting DNS servers in `/etc/resolv.conf`. None of these worked for me.

I eventually came across a solution [here](https://github.com/sakai135/wsl-vpnkit) which did the trick. This takes advantage of the fact that Docker for Windows is already utilizing `vpnkit` for connectivity - so you may also want to be sure Docker Desktop is configured to start at login.

The instructions worked well for me so I won't rehash them all here. When it came time to modify my `/etc/resolv.conf` file, I added in two of the internal DNS servers followed by the IP for my home router's DNS service. This allows me to use WSL2 both on and off the corporate network without having to reconfigure things. 

All I need to do now is execute `sudo ./wsl-vpnkit` and leave that running in the background when I need to use WSL while connected to the corporate VPN. 


![Successful connection via wsl-vpnkit](MnmMuA0HC.png)

Whew! Okay, back to work.

