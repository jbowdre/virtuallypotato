---
title: "Removing and Recreating vCLS VMs" # Title of the blog post.
date: 2022-07-23T16:25:05-05:00 # Date of post creation.
# lastmod: 2022-07-23T16:25:05-05:00 # Date when last modified
description: "How to remove and (optionally) recreate the vSphere Clustering Services VMs" # Description used for search engine.
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
  - vsphere 
comment: true # Disable comment if false.
---

Way back in 2020, VMware released vSphere 7 Update 1 and introduced the new [vSphere Clustering Services (vCLS)](https://core.vmware.com/resource/introduction-vsphere-clustering-service-vcls) to improve how cluster services like the Distributed Resource Scheduler (DRS) operate. vCLS deploys lightweight agent VMs directly on the cluster being managed, and those VMs provide a decoupled and distributed control plane to offload some of the management responsibilities from the vCenter server. 

![vCLS VM](vcls-vm.png)

That's very cool, particularly in large continent-spanning environments or those which reach into multiple clouds, but it may not make sense to add those additional workloads in resource-constrained homelabs. And while the vCLS VMs are supposed to be automagically self-managed, sometimes things go a little wonky and that management fails to function correctly, which can negatively impact DRS.

