---
title: "Cat a File Without Comments" # Title of the blog post.
date: 2023-02-22 # Date of post creation.
# lastmod: 2023-02-20T10:32:20-06:00 # Date when last modified
description: "A quick trick to strip out the comments when viewing the contents of a file." # Description used for search engine.
featured: false # Sets if post is a featured post, making appear on the home page side bar.
draft: false # Sets whether to render this page. Draft of true will not be rendered.
toc: true # Controls if a table of contents should be generated for first-level links automatically.
usePageBundles: true
# menu: main
# featureImage: "file.png" # Sets featured image on blog post.
# featureImageAlt: 'Description of image' # Alternative text for featured image.
# featureImageCap: 'This is the featured image.' # Caption (optional).
# thumbnail: "thumbnail.png" # Sets thumbnail image appearing inside card on homepage.
# shareImage: "share.png" # Designate a separate image for social media sharing.
codeLineNumbers: false # Override global value for showing of line numbers within code block.
series: Tips # Projects, Scripts, vRA8, K8s on vSphere
tags:
  - linux
  - shell
  - regex
comment: true # Disable comment if false.
---
It's super handy when a Linux config file is loaded with comments to tell you precisely how to configure the thing, but all those comments can really get in the way when you're trying to review the current configuration.

Next time, instead of scrolling through page after page of lengthy embedded explanations, just use:
```shell
egrep -v "^\s*(#|$)" $filename
```

For added usefulness, I alias this command to `ccat` (which my brain interprets as "commentless cat") in [my `~/.zshrc`](https://github.com/jbowdre/dotfiles/blob/main/zsh/.zshrc):
```shell
alias ccat='egrep -v "^\s*(#|$)"'
```

Now instead of viewing all 75 lines of a [mostly-default Vagrantfile](/create-vms-chromebook-hashicorp-vagrant), I just see the 7 that matter:
```shell
; wc -l Vagrantfile
75 Vagrantfile

; ccat Vagrantfile
Vagrant.configure("2") do |config|
  config.vm.box = "oopsme/windows11-22h2"
  config.vm.provider :libvirt do |libvirt|
    libvirt.cpus = 4
    libvirt.memory = 4096
  end
end

; ccat Vagrantfile | wc -l
7
```

Nice!
