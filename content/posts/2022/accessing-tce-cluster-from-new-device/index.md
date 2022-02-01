---
title: "Accessing a Tanzu Community Edition Kubernetes Cluster from a new device" # Title of the blog post.
date: 2022-02-01T10:58:57-06:00 # Date of post creation.
# lastmod: 2022-02-01T10:58:57-06:00 # Date when last modified
description: "The Tanzu Community Edition documentation does a great job of explaining how to authenticate to a newly-deployed cluster at the tail end of the installation steps, but how do you log in from another system?" # Description used for search engine.
featured: false # Sets if post is a featured post, making appear on the home page side bar.
draft: true # Sets whether to render this page. Draft of true will not be rendered.
toc: false # Controls if a table of contents should be generated for first-level links automatically.
usePageBundles: true
# menu: main
# featureImage: "file.png" # Sets featured image on blog post.
# featureImageAlt: 'Description of image' # Alternative text for featured image.
# featureImageCap: 'This is the featured image.' # Caption (optional).
# thumbnail: "thumbnail.png" # Sets thumbnail image appearing inside card on homepage.
# shareImage: "share.png" # Designate a separate image for social media sharing.
codeLineNumbers: false # Override global value for showing of line numbers within code block.
series: Tips
tags:
  - vmware
  - kubernetes
  - tanzu
comment: true # Disable comment if false.
---
When I [recently set up my Tanzu Community Edition environment](/tanzu-community-edition-k8s-homelab/), I did so from a Linux VM since I knew that my Chromebook Linux environment wouldn't support the `kind` bootstrap cluster used for the deployment. But now I'd like to be able to connect to the cluster directly using the `tanzu` and `kubectl` CLI tools. How do I get the appropriate cluster configuration over to my Chromebook?

The Tanzu CLI actually makes that pretty easy. I just run these commands on my Linux VM to export the `kubeconfig` of my management (`tce-mgmt`) and workload (`tce-work`) clusters to a pair of files:
```shell
tanzu management-cluster kubeconfig get --admin --export-file tce-mgmt-kubeconfig.yaml
tanzu cluster kubeconfig get tce-work --admin --export-file tce-work-kubeconfig.yaml
```

I could then use `scp` to pull the files from the VM into my local Linux environment. I then needed to [install `kubectl`](/tanzu-community-edition-k8s-homelab/#kubectl-binary) and the [`tanzu` CLI](/tanzu-community-edition-k8s-homelab/#tanzu-cli) (making sure to also [enable shell auto-completion](/enable-tanzu-cli-auto-completion-bash-zsh/) along the way!), and I could import the configurations locally:

```shell
❯ tanzu login --kubeconfig tce-mgmt-kubeconfig.yaml --context tce-mgmt-admin@tce-mgmt --name tce-mgmt
✔  successfully logged in to management cluster using the kubeconfig tce-mgmt

❯ tanzu login --kubeconfig tce-work-kubeconfig.yaml --context tce-work-admin@tce-work --name tce-work
✔  successfully logged in to management cluster using the kubeconfig tce-work
```





