---
title: "Upgrading a Standalone vSphere Host With esxcli" # Title of the blog post.
date: 2022-10-14T07:19:24-05:00 # Date of post creation.
# lastmod: 2022-10-14T07:19:24-05:00 # Date when last modified
description: "Exploring the steps to manually upgrade a standalone host from ESXi 7 to ESXi 8 using the esxcli over an SSH connection." # Description used for search engine.
featured: false # Sets if post is a featured post, making appear on the home page side bar.
draft: true # Sets whether to render this page. Draft of true will not be rendered.
toc: true # Controls if a table of contents should be generated for first-level links automatically.
usePageBundles: true
# menu: main
# featureImage: "file.png" # Sets featured image on blog post.
# featureImageAlt: 'Description of image' # Alternative text for featured image.
# featureImageCap: 'This is the featured image.' # Caption (optional).
# thumbnail: "thumbnail.png" # Sets thumbnail image appearing inside card on homepage.
# shareImage: "share.png" # Designate a separate image for social media sharing.
codeLineNumbers: false # Override global value for showing of line numbers within code block.
series: Tips # Projects, Scripts, vRA8
tags:
  - vmware
  - homelab
  - vsphere
comment: true # Disable comment if false.
---
You may have heard that there's a new vSphere release out in the wild - [vSphere 8, which just reached Initial Availability this week](https://advocacy.vmware.com/Article/Redirect/9cfbc1b1-207f-4885-a520-cc0bfafcd6c0?uc=197618&g=2d17264e-593a-492d-8d91-3a2155e835f1&f=3104867). Upgrading the vCenter in my single-host homelab is a very straightforward task, and using the included Lifecycle Manager would make quick work of patching a cluster of hosts... but things get a little trickier with a single host. I could write the installer ISO to a USB drive, boot the host off of that, and go through the install interactively, but what if physical access to the host is kind of inconvenient?

The other option for upgrading a host is using the `esxcli` command to apply an update from a `depot.zip`. It's a pretty easy solution (and can even be done remotely, such as when connected to my homelab via the [Tailscale node running on my Quartz64 ESXi-ARM host](esxi-arm-on-quartz64/#installing-tailscale)) *but I always forget the commands.*

So here's quick note on how I upgraded my lone ESXi to the new ESXi 8 IA release so that maybe I'll remember how to do it next time and won't have to go [Neeva](https://neeva.com)'ing for the answer again.


```shell
; esxcli system maintenanceMode set -e true
; esxcli software sources profile list -d /vmfs/volumes/nuchost-local/_Patches/VMware-ESXi-8.0-20513097-depot.zip
Name                          Vendor        Acceptance Level  Creation Time        Modification Time
----------------------------  ------------  ----------------  -------------------  -----------------
ESXi-8.0.0-20513097-standard  VMware, Inc.  PartnerSupported  2022-09-23T18:59:28  2022-09-23T18:59:28
ESXi-8.0.0-20513097-no-tools  VMware, Inc.  PartnerSupported  2022-09-23T18:59:28  2022-09-23T18:59:28
; esxcli software profile update -d /vmfs/volumes/nuchost-local/_Patches/VMware-ESXi-8.0-2051309
7-depot.zip -p ESXi-8.0.0-20513097-standard
; reboot
```