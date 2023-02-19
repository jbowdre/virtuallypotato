---
title: "Run Virtual Machines on a Chromebook with HashiCorp Vagrant" # Title of the blog post.
date: 2023-02-18T17:22:02-06:00 # Date of post creation.
# lastmod: 2023-02-18T17:22:02-06:00 # Date when last modified
description: "Pairing the powerful Linux Development Environment on modern Chromebooks with HashiCorp Vagrant for managing local virtual machines for development and testing" # Description used for search engine.
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
series: Projects
tags:
  - linux
  - chromeos
  - homelab
  - infrastructure-as-code
comment: true # Disable comment if false.
---
I've lately been trying to do more with [Salt](https://saltproject.io/) at work, but I'm still very much a novice with that tool. I thought it would be great to have a nice little lab environment where I could deploy a few lightweight VMs and practice managing them with Salt - without impacting any systems that are actually being used for anything. I thought it might be fun to create and manage the VMs with [HashiCorp Vagrant](https://www.vagrantup.com/), which provides a declarative way to define what the VMs should look like. That will make it easy to build up, destroy, and redeploy a development environment in a simple, repeatable way.

Also, because I'm a bit of a sadist, I wanted to do this all on my new [Framework Chromebook](https://frame.work/laptop-chromebook-12-gen-intel). I might as well put my 32GB of RAM to good use, right? It took a bit of fumbling, but this article describes what it took to get a Vagrant VM up and running in the [Linux Development Environment](https://chromeos.dev/en/linux) on my Chromebook (which is currently running ChromeOS v111 beta).

### Install the prerequisites
There are are a few packages which need to be installed before we can move on to the Vagrant-specific stuff. It's quite possible that these are already on your system.... but if they *aren't* already present you'll have a bad problem[^problem].
```shell
sudo apt update
sudo apt install \
  build-essential \
  gpg \
  lsb-release \
  wget
```

[^problem]: and [will not go to space today](https://xkcd.com/1133/).
I'll be configuring Vagrant to use [`libvirt`](https://libvirt.org/) to interface with the [Kernel Virtual Machine (KVM)](https://www.linux-kvm.org/page/Main_Page) virtualization solution (rather than something like VirtualBox that would bring more overhead) so I'll need to install some packages for that as well:
```shell
sudo apt install virt-manager libvirt-dev
```

And to avoid having to `sudo` each time I interact with `libvirt`, I'll add myself to that group:
```shell
sudo gpasswd -a $USER libvirt ; newgrp libvirt
```

Add HashiCorp repo:
```shell
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
```

Install `vagrant` and plugins:
```shell
sudo apt update
sudo apt install vagrant
vagrant plugin install vagrant-libvirt
```

Prepare a Vagrant directory:
```shell
mkdir vagrant-bullseye
cd vagrant-bullseye
vagrant init debian/bullseye64
```

Install `rsync`:
```shell
sudo apt install rsync
```

Enable `rsync` (and disable NFS, which isn't supported within LXD) for Vagrant by editing the `Vagrantfile` to include:
```
  config.nfs.verify_installed = false
  config.vm.synced_folder '.', '/vagrant', type: 'rsync'
```

Start the VM:
```shell
vagrant up
```

Log in:
```shell
vagrant ssh
```

