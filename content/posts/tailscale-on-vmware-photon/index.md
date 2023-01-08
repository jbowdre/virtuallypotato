---
title: "Tailscale on VMware Photon OS" # Title of the blog post.
date: 2022-12-14T10:21:12-06:00 # Date of post creation.
lastmod: 2022-12-15T10:21:12-06:00 # Date when last modified
description: "How to manually install Tailscale on VMware's Photon OS - or any other systemd-based platform without official Tailscale packages." # Description used for search engine.
featured: false # Sets if post is a featured post, making appear on the home page side bar.
draft: false # Sets whether to render this page. Draft of true will not be rendered.
toc: false # Controls if a table of contents should be generated for first-level links automatically.
usePageBundles: true
# menu: main
# featureImage: "file.png" # Sets featured image on blog post.
# featureImageAlt: 'Description of image' # Alternative text for featured image.
# featureImageCap: 'This is the featured image.' # Caption (optional).
thumbnail: "Tailscale-AppIcon.png" # Sets thumbnail image appearing inside card on homepage.
# shareImage: "share.png" # Designate a separate image for social media sharing.
codeLineNumbers: false # Override global value for showing of line numbers within code block.
series: Tips # Projects, Scripts, vRA8, K8s on vSphere
tags:
  - vmware
  - linux
  - wireguard
  - networking
  - security
  - tailscale
comment: true # Disable comment if false.
---
You might remember that I'm a [pretty big fan](/secure-networking-made-simple-with-tailscale/) of [Tailscale](https://tailscale.com), which makes it easy to connect your various devices together in a secure [tailnet](https://tailscale.com/kb/1136/tailnet/), or private network. Tailscale is super simple to set up on most platforms, but you'll need to [install it manually](https://tailscale.com/download/linux/static) if there isn't a prebuilt package for your system. 

Here's a condensed list of the [steps that I took to manually install Tailscale](/esxi-arm-on-quartz64/#installing-tailscale) on VMware's [Photon OS](https://github.com/vmware/photon), though the same (or similar) steps should also work on just about any other `systemd`-based system.

1. Visit [https://pkgs.tailscale.com/stable/#static](https://pkgs.tailscale.com/stable/#static) to see the latest stable version for your system architecture, and copy the URL. For instance, I'll be using `https://pkgs.tailscale.com/stable/tailscale_1.34.1_arm64.tgz`. 
2. Download and extract it to the system:
```shell
wget https://pkgs.tailscale.com/stable/tailscale_1.34.1_arm64.tgz
tar xvf tailscale_1.34.1_arm64.tgz
cd tailscale_1.34.1_arm64/
```
3. Install the binaries and service files:
```shell
sudo install -m 755 tailscale /usr/bin/
sudo install -m 755 tailscaled /usr/sbin/
sudo install -m 644 systemd/tailscaled.defaults /etc/default/tailscaled
sudo install -m 644 systemd/tailscaled.service /usr/lib/systemd/system/
```
4. Start the service:
```shell
sudo systemctl enable tailscaled
sudo systemctl start tailscaled
```

From that point, just [`sudo tailscale up`](https://tailscale.com/kb/1080/cli/#up) like normal.

{{% notice info "Updating Tailscale" %}}
Since Tailscale was installed outside of any package manager, it won't get updated automatically. When new versions are released you'll need to update it manually. To do that:
1. Download and extract the new version.
2. Install the `tailscale` and `tailscaled` binaries as described above (no need to install the service files again).
3. Restart the service with `sudo systemctl restart tailscaled`.
{{% /notice %}}
