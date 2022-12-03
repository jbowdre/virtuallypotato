---
title: "K8s on vSphere: Building a Node Template With Packer" # Title of the blog post.
date: 2022-12-03T10:41:17-08:00 # Date of post creation.
# lastmod: 2022-12-03T10:41:17-08:00 # Date when last modified
description: "Using HashiCorp Packer to automatically build Kubernetes node templates" # Description used for search engine.
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
  - vmware
  - linux
  - shell
  - automation
  - kubernetes
  - containers
  - InfrastructureAsCode
  - packer
comment: true # Disable comment if false.
---
I've been leveraging the open-source Tanzu Community Edition Kubernetes distribution for a little while now, both [in my home lab](/tanzu-community-edition-k8s-homelab) and at work, so I was gutted by the news that VMware was [abandoning the project](https://github.com/vmware-tanzu/community-edition). TCE had been a pretty good fit for my needs, and now I needed to search for a replacement. VMware is offering a free version of Tanzu Kubernetes Grid as a replacement, but it comes with a license solely for non-commercial use so I wouldn't be able to use it at work. And I'd really like to use the same products in both environments to make development and testing easier on me.

There are a bunch of great projects for running Kubernetes in development/lab environments, and others optimized for much larger enterprise environments, but I struggled to find a product that felt like a good fit for both in the way TCE was. My workloads are few and pretty simple so most enterprise K8s variants (Tanzu included) would feel like overkill, but I do need to ensure everything remains highly-available in the data centers at work.

So I set out to build my own! In the next couple of posts, I'll share the details of how I'm using Terraform to provision production-ready vanilla Kubernetes clusters on vSphere (complete with the vSphere Container Storage Interface plugin!) in a consistent and repeatable way. I also plan to document one of the ways I'm leveraging these clusters, which is using them as a part of a Gitlab CI/CD pipeline to churn out weekly VM template builds so I never again have to worry about my templates being out of date.

I've learned a ton in the process (and still have a lot more to learn), but today I'll start simply by describing my approach to building a single VM template ready to enter service as a Kubernetes compute node.

## What's Packer, and why?
[HashiCorp Packer](https://www.packer.io/) is a free open-source tool designed to create consistent, repeatable machine images. It's pretty killer as a part of a CI/CD pipeline to kick off new builds based on a schedule or code commits, but also works great for creating builds on-demand. Packer uses the [HashiCorp Configuration Language (HCL)](https://developer.hashicorp.com/packer/docs/templates/hcl_templates) to describe all of the properties of a VM build in a concise and readable format. 

You might ask why I would bother with using a powerful tool like Packer if I'm just going to be building a single template. Surely I could just do that by hand, right? And of course, you'd be right - but using an Infrastructure as Code tool even for one-off builds has some pretty big advantages. 

- **It's fast.** Packer is able to build a complete VM (including pulling in all available OS and software updates) in just a few minutes, much faster than I could click through an installer on my own.
- **It's consistent.** Packer will follow the exact same steps for every build, removing the small variations (and typos!) that would surely show up if I did the builds manually.
- **It's great for testing changes.** Since Packer builds are so fast and consistent, it makes it incredibly easy to test changes as I go. I can be confident that the *only* changes between two builds will be the changes I deliberately introduced. 
- **It's self-documenting.** The entire VM (and its guest OS) is described completely within the Packer HCL file(s), which I can review to remember which packages were installed, which user account(s) were created, what partition scheme was used, and anything else I might need to know.
- **It supports change tracking.** A Packer build is just a set of HCL files so it's easy to sync them with a version control system like Git to track (and revert) changes as needed.

Packer is also extremely versatile, and a broad set of [external plugins](https://developer.hashicorp.com/packer/plugins) expand its capabilities to support creating machines for basically any environment. For my needs, I'll be utilizing the [vsphere-iso](https://developer.hashicorp.com/packer/plugins/builders/vsphere/vsphere-iso) builder which uses the vSphere API to remotely build VMs directly in the environment.

Sounds pretty cool, right? I'm not going to go too deep into "how to Packer" in this post, but HashiCorp does provide some [pretty good tutorials](https://developer.hashicorp.com/packer/tutorials) to help you get started.

## Building my template
I'll be using Ubuntu 20.04 LTS as the OS for my Kubernetes node template. I'll add in Kubernetes components like `containerd`, `kubectl`, `kubelet`, and `kubeadm`, and apply a few additional tweaks to get it fully ready.

### File/folder layout
After quite a bit of experimentation, I've settled on a preferred way to organize my Packer build files. I've found that this structure makes the builds modular enough that it's easy to reuse components in other builds, but still consolidated enough to be easily manageable. This layout is, of course, largely subjective - it's just what works well *for me*:

```
.
├── certs
│   ├── ca.cer
├── data
│   ├── meta-data
│   └── user-data.pkrtpl.hcl
├── packer_cache
│   └── ssh_private_key_packer.pem
├── scripts
│   ├── cleanup-cloud-init.sh
│   ├── cleanup-subiquity.sh
│   ├── configure-sshd.sh
│   ├── disable-multipathd.sh
│   ├── disable-release-upgrade-motd.sh
│   ├── enable-vmware-customization.sh
│   ├── generalize.sh
│   ├── install-ca-certs.sh
│   ├── install-k8s.sh
│   ├── persist-cloud-init-net.sh
│   ├── update-packages.sh
│   ├── wait-for-cloud-init.sh
│   └── zero-disk.sh
├── ubuntu-k8s.auto.pkrvars.hcl
├── ubuntu-k8s.pkr.hcl
└── variables.pkr.hcl
```

- The `certs` folder holds the Base64-encoded PEM-formatted certificate of my [internal Certificate Authority](/ldaps-authentication-tanzu-community-edition/#prequisite) which will be automatically installed in the provisioned VM's trusted certificate store. I could also include additional root or intermediate certificates as needed, just as long as the file names end in `*.cer` (we'll see why later).
- The `data` folder stores files used for generating the `cloud-init` configuration that will be used for the OS installation and configuration.
- `packer_cache` keeps the SSH private key that Packer will use for logging in to the provisioned VM post-install.
- The `scripts` directory holds a collection of scripts used for post-install configuration tasks. Sure, I could just use a single large script, but using a bunch of smaller ones helps keep things modular and easy to reuse elsewhere.
- `variables.pkr.hcl` declares all of the variables which will be used in the Packer build, and sets the default values for some of them.
- `ubuntu-k8s.auto.pkrvars.hcl` assigns values to those variables. This is where most of the user-facing options will be configured, such as usernames, passwords, and environment settings. 
- `ubuntu-k8s.pkr.hcl` is where the build process is actually described.

Let's quickly run through that build process, and then we'll back up and examine some other components in detail.

### `ubuntu-k8s.pkr.hcl`
#### `packer` block
The first block in the file tells Packer about the minimum version requirements for Packer as well as the external plugins used for the build:
```
//  BLOCK: packer
//  The Packer configuration.
packer {
  required_version = ">= 1.8.2"
  required_plugins {
    vsphere     = {
      version   = ">= 1.0.8"
      source    = "github.com/hashicorp/vsphere"
    }
    sshkey      = {
      version   = ">= 1.0.3"
      source    = "github.com/ivoronin/sshkey"
    }
  }
}
```
As I mentioned above, I'll be using the official [`vsphere` plugin](https://github.com/hashicorp/packer-plugin-vsphere) to handle the provisioning on my vSphere environment. I'll also make use of the [`sshkey` plugin](https://github.com/ivoronin/packer-plugin-sshkey) to easily handle the SSH keys.

#### `locals` block
Locals are a type of Packer variable which aren't explicitly declared in the `variables.pkr.hcl` file. They only exist within the context of a single build (hence the "local" name). Typical Packer variables are static and don't support string manipulation; locals, however, do support expressions that can be used to change their value on the fly. This makes them very useful when you need to combine variables (like a datastore name, path, filename) into a single string (such as in the highlighted line):

```text {hl_lines=[13]}
//  BLOCK: locals
//  Defines the local variables.
data "sshkey" "install" {
}

locals {
  ssh_public_key        = data.sshkey.install.public_key
  ssh_private_key_file  = data.sshkey.install.private_key_path
  build_tool            = "HashiCorp Packer ${packer.version}"
  build_date            = formatdate("YYYY-MM-DD hh:mm ZZZ", timestamp())
  build_description     = "Kubernetes Ubuntu 20.04 Node template\nBuild date: ${local.build_date}\nBuild tool: ${local.build_tool}"
  shutdown_command      = "sudo -S -E shutdown -P now"
  iso_paths             = ["[${var.common_iso_datastore}] ${var.iso_path}/${var.iso_file}"]
  iso_checksum          = "${var.iso_checksum_type}:${var.iso_checksum_value}"
  data_source_content   = {
    "/meta-data"            = file("data/meta-data")
    "/user-data"            = templatefile("data/user-data.pkrtpl.hcl", {
      build_username        = var.build_username
      build_password        = bcrypt(var.build_password)
      build_key             = var.build_key
      vm_guest_os_language  = var.vm_guest_os_language
      vm_guest_os_keyboard  = var.vm_guest_os_keyboard
      vm_guest_os_timezone  = var.vm_guest_os_timezone
      vm_guest_os_hostname  = var.vm_name
      apt_mirror            = var.cloud_init_apt_mirror
      apt_packages          = var.cloud_init_apt_packages
    })
  }
}
```

I'm also using this block and the built-in `templatefile()` function to insert build-specific variables the `cloud-init` template files (more on that in a bit).



