---
series: Projects
date: "2018-09-26T08:34:30Z"
thumbnail: images/posts-2020/i0UKdXleC.png
tags:
- docker
- linux
- cloud
title: BitWarden password manager self-hosted on free Google Cloud instance
---

![Bitwarden login](/images/posts-2020/i0UKdXleC.png)

A friend mentioned the  [BitWarden](https://bitwarden.com/) password manager to me yesterday and I had to confess that I'd never heard of it. I started researching it and was impressed by what I found: it's free, [open-source](https://github.com/bitwarden), feature-packed, fully cross-platform (with Windows/Linux/MacOS desktop clients, Android/iOS mobile apps, and browser extensions for Chrome/Firefox/Opera/Safari/Edge/etc), and even offers a self-hosted option.

I wanted to try out the self-hosted setup, and I discovered that the [official distribution](https://help.bitwarden.com/article/install-on-premise/) works beautifully on an `n1-standard-1` 1-vCPU Google Compute Engine instance - but that would cost me an estimated $25/mo to run after my free Google Cloud Platform trial runs out. And I can't really scale that instance down further because the embedded database won't start with less than 2GB of RAM.

I then came across [this comment](https://www.reddit.com/r/Bitwarden/comments/8vmwwe/best_place_to_self_host_bitwarden/e1p2f71/) on Reddit which discussed in somewhat-vague terms the steps required to get BitWarden to run on the [free](https://cloud.google.com/free/docs/always-free-usage-limits#compute_name) `f1-micro` instance, and also introduced me to the community-built [bitwarden_rs](https://github.com/dani-garcia/bitwarden_rs) project which is specifically designed to run a BW-compatible server on resource-constrained hardware. So here are the steps I wound up taking to get this up and running.

### Spin up a VM
*Easier said than done, but head over to https://console.cloud.google.com/ and fumble through:*

1. Creating a new project (or just add an instance to an existing one).
2. Creating a new Compute Engine instance, selecting `f1-micro` for the Machine Type and ticking the *Allow HTTPS traffic* box.
3. *(Optional)* Editing the instance to add an ssh-key for easier remote access.

### Configure Dynamic DNS
*Because we're cheap and don't want to pay for a static IP.*

1. Log in to the [Google Domain admin portal](https://domains.google.com/registrar) and [create a new Dynamic DNS record](https://domains.google.com/registrar). This will provide a username and password specific for that record.
2. Log in to the GCE instance and run `sudo apt-get update` followed by `sudo apt-get install ddclient`. Part of the install process prompts you to configure things... just accept the defaults and move on.
3. Edit the `ddclient` config file to look like this, substituting the username, password, and FDQN from Google Domains:
```shell
$ sudo vi /etc/ddclient.conf
     # Configuration file for ddclient generated by debconf
     #
     # /etc/ddclient.conf

     protocol=googledomains,
     ssl=yes,
     syslog=yes,
     use=web,
     server=domains.google.com,
     login='[USERNAME]',
     password='[PASSWORD]',
     [FQDN]
```
4. `sudo vi /etc/default/ddclient` and make sure that `run_daemon="true"`:

```shell
# Configuration for ddclient scripts 
# generated from debconf on Sat Sep  8 21:58:02 UTC 2018
#
# /etc/default/ddclient

# Set to "true" if ddclient should be run every time DHCP client ('dhclient'
# from package isc-dhcp-client) updates the systems IP address.
run_dhclient="false"

# Set to "true" if ddclient should be run every time a new ppp connection is 
# established. This might be useful, if you are using dial-on-demand.
run_ipup="false"

# Set to "true" if ddclient should run in daemon mode
# If this is changed to true, run_ipup and run_dhclient must be set to false.
run_daemon="true"

# Set the time interval between the updates of the dynamic DNS name in seconds.
# This option only takes effect if the ddclient runs in daemon mode.
daemon_interval="300"
```
5. Restart the `ddclient` service  - twice for good measure (daemon mode only gets activated on the second go *because reasons*):
```shell
$ sudo systemctl restart ddclient
$ sudo systemctl restart ddclient
```
6. After a few moments, refresh the Google Domains page to verify that your instance's external IP address is showing up on the new DDNS record.

### Install Docker
*Steps taken from [here](https://docs.docker.com/install/linux/docker-ce/debian/).*
1. Update `apt` package index:
```shell
$ sudo apt-get update
```
2. Install package management prereqs:
```shell
$ sudo apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg2 \
    software-properties-common
```
3. Add Docker GPG key:
```shell
$ curl -fsSL https://download.docker.com/linux/debian/gpg | sudo apt-key add -
```
4. Add the Docker repo:
```shell
$ sudo add-apt-repository \
    "deb [arch=amd64] https://download.docker.com/linux/debian \
    $(lsb_release -cs) \
    stable"
```
5. Update apt index again:
```shell
$ sudo apt-get update
```
6. Install Docker:
```shell
$ sudo apt-get install docker-ce
```

### Install Certbot and generate SSL cert
*Steps taken from [here](https://certbot.eff.org/lets-encrypt/debianstretch-other.html).*
1. Add `stretch-backports` repo:
```shell
$ sudo add-apt-repository \
    "deb https://ftp.debian.org/debian \
    stretch-backports main"
```
2. Install Certbot:
```shell
$ sudo apt-get install certbot -t stretch-backports
```
3. Generate certificate:
```shell
$ sudo certbot certonly --standalone -d [FQDN]
```
4. Create a directory to store the new certificates and copy them there:
```shell
$ sudo mkdir -p /ssl/keys/
$ sudo cp -p /etc/letsencrypt/live/[FQDN]/fullchain.pem /ssl/keys/
$ sudo cp -p /etc/letsencrypt/live/[FQDN]/privkey.pem /ssl/keys/
```

### Set up bitwarden_rs
*Using the container image available [here](https://github.com/dani-garcia/bitwarden_rs).*
1. Let's just get it up and running first:
```shell
$ sudo docker run -d --name bitwarden \
    -e ROCKET_TLS={certs='"/ssl/fullchain.pem", key="/ssl/privkey.pem"}' \
    -e ROCKET_PORT='8000' \
    -v /ssl/keys/:/ssl/ \
    -v /bw-data/:/data/ \
    -v /icon_cache/ \
    -p 0.0.0.0:443:8000 \
    mprasil/bitwarden:latest
```
2. At this point you should be able to point your web browser at `https://[FQDN]` and see the BitWarden login screen. Click on the Create button and set up a new account. Log in, look around, add some passwords, etc. Everything should basically work just fine.
3. Unless you want to host passwords for all of the Internet you'll probably want to disable signups at some point by adding the `env` option `SIGNUPS_ALLOWED=false`. And you'll need to set `DOMAIN=https://[FQDN]` if you want to use U2F authentication:
```shell
$ sudo docker stop bitwarden
$ sudo docker rm bitwarden
$ sudo docker run -d --name bitwarden \
    -e ROCKET_TLS={certs='"/ssl/fullchain.pem",key="/ssl/privkey.pem"'} \
    -e ROCKET_PORT='8000' \
    -e SIGNUPS_ALLOWED=false \
    -e DOMAIN=https://[FQDN] \
    -v /ssl/keys/:/ssl/ \
    -v /bw-data/:/data/ \
    -v /icon_cache/ \
    -p 0.0.0.0:443:8000 \
    mprasil/bitwarden:latest
```

### Install bitwarden_rs as a service
*So we don't have to keep manually firing this thing off.*
1. Create a script to stop, remove, update, and (re)start the `bitwarden_rs` container:
```shell
$ sudo vi /usr/local/bin/start-bitwarden.sh
    #!/bin/bash

    docker stop bitwarden
    docker rm bitwarden
    docker pull mprasil/bitwarden

    docker run -d --name bitwarden \
            -e ROCKET_TLS={certs='"/ssl/fullchain.pem",key="/ssl/privkey.pem"'} \
            -e ROCKET_PORT='8000' \
            -e SIGNUPS_ALLOWED=false \
            -e DOMAIN=https://[FQDN] \
            -v /ssl/keys/:/ssl/ \
            -v /bw-data/:/data/ \
            -v /icon_cache/ \
            -p 0.0.0.0:443:8000 \
            mprasil/bitwarden:latest
$ sudo chmod 744 /usr/local/bin/start-bitwarden.sh
```
2. And add it as a `systemd` service:
```shell
$ sudo vi /etc/systemd/system/bitwarden.service
    [Unit]
    Description=BitWarden container
    Requires=docker.service
    After=docker.service

    [Service]
    Restart=always
    ExecStart=/usr/local/bin/bitwarden-start.sh
    ExecStop=/usr/bin/docker stop bitwarden

    [Install]
    WantedBy=default.target
$ sudo chmod 644 /etc/systemd/system/bitwarden.service
```
3. Try it out:
```shell
$ sudo systemctl start bitwarden
$ sudo systemctl status bitwarden
    ● bitwarden.service - BitWarden container
       Loaded: loaded (/etc/systemd/system/bitwarden.service; enabled; vendor preset: enabled)
       Active: deactivating (stop) since Sun 2018-09-09 03:43:20 UTC;   1s ago
      Process: 13104 ExecStart=/usr/local/bin/bitwarden-start.sh (code=exited, status=0/SUCCESS)
     Main PID: 13104 (code=exited, status=0/SUCCESS); Control PID:  13229 (docker)
        Tasks: 5 (limit: 4915)
       Memory: 9.7M
          CPU: 375ms
       CGroup: /system.slice/bitwarden.service
               └─control
                 └─13229 /usr/bin/docker stop bitwarden

    Sep 09 03:43:20 bitwarden bitwarden-start.sh[13104]: Status: Image is up to date for mprasil/bitwarden:latest
    Sep 09 03:43:20 bitwarden bitwarden-start.sh[13104]:        ace64ca5294eee7e21be764ea1af9e328e944658b4335ce8721b99a33061d645
```

### Conclusion
If all went according to plan, you've now got a highly-secure open-source full-featured cross-platform password manager running on an Always Free Google Compute Engine instance resolved by Google Domains dynamic DNS. Very slick!