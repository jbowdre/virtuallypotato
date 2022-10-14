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