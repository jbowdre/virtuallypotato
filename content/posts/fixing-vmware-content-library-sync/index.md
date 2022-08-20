---
title: "Fixing VMWare Content Library Sync" # Title of the blog post.
date: 2022-08-20T15:29:39-05:00 # Date of post creation.
# lastmod: 2022-08-20T15:29:39-05:00 # Date when last modified
description: "An rsync-based solution to improve how VMware Content Libraries synchronize OVF templates to remote locations." # Description used for search engine.
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
  - linux
  - docker
  - shell
  - automation
  - containers
  - python
comment: true # Disable comment if false.
---
VMware Content Libraries provide a convenient way to store and share content like VM and OVF templates, ISO images, and other files within virtualized environments.
