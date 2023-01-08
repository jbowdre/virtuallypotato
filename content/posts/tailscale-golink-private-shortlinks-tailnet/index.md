---
title: "Tailscale golink: Private Shortlinks for your Tailnet" # Title of the blog post.
date: 2023-01-08T13:51:42-06:00 # Date of post creation.
# lastmod: 2023-01-08T13:51:42-06:00 # Date when last modified
description: "How to deploy Tailscale's golink service in a Docker container."
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
series: Tips # Projects, Scripts, vRA8, K8s on vSphere
tags:
  - docker
  - vpn
  - tailscale
  - wireguard
  - containers
comment: true # Disable comment if false.
---
I've shared in the past about how I use [custom search engines in Chrome](/abusing-chromes-custom-search-engines-for-fun-and-profit/) as quick web shortcuts. And I may have mentioned [my love for Tailscale](/tags/tailscale/) a time or two as well. Well I recently learned of a way to combine these two passions: [Tailscale golink](https://github.com/tailscale/golink). The [golink announcement poston the Tailscale blog](https://tailscale.com/blog/golink/) offers a great overview of the service:
> Using golink, you can create and share simple go/name links for commonly accessed websites, so that anyone in your network can access them no matter the device they’re on — without requiring browser extensions or fiddling with DNS settings. And because golink integrates with Tailscale, links are private to users in your tailnet without any separate user management, logins, or security policies. 

And these go links don't have to be simply static shortcuts; the system is able to leverage go templates to conditionally insert text into the target URL - similar to my custom search engine setup. The Tailscale blog also has some clever suggestions on how to use this capability. 

Sounds great - but how do you actually make golink available on your Tailnet? Well, here's what I did to deploy the [golink Docker image](https://github.com/tailscale/golink/pkgs/container/golink) on a [Photon OS VM I set up running on my Quartz64 running ESXi-ARM](/esxi-arm-on-quartz64/#workload-creation).

## Tailnet prep
There are two things I'll need to do in the Tailscale admin portal before moving on.
### Create an ACL tag



I'm going to be deploying the [golink Docker image](https://github.com/tailscale/golink/pkgs/container/golink) on a [Photon OS VM I set up running on my Quartz64 running ESXi-ARM](/esxi-arm-on-quartz64/#workload-creation). The [golink repo](https://github.com/tailscale/golink) offers this command for running the container:
```shell
docker run -it --rm ghcr.io/tailscale/golink:main
```

The doc also indicates that I can pass a Tailscale auth key to the golink service via the `TS_AUTHKEY` environment variable, and that all the configuration will be stored in `/home/nonroot` (which will be owned by uid/gid `65532`). I'll take this knowledge and use it to craft a `docker-compose.yml` to simplify container management.

```shell
mkdir -p golink/data
cd golink
chmod 65536:65563 data
vi docker-compose.yaml
```

```yaml
# golink docker-compose.yaml
version: '3'
services:
  golink:
    container_name: golink
    restart: unless-stopped
    image: ghcr.io/tailscale/golink:main
    environment:
      - TS_AUTHKEY: MY_TS_AUTHKEY
    volumes:
      - './data:/home/nonroot'
```

I'll need to create a new authentication key from the [Tailscale admin portal](https://login.tailscale.com/admin/settings/keys).
