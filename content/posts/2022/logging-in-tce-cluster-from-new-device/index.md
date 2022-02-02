---
title: "Logging in to a Tanzu Community Edition Kubernetes Cluster from a new device" # Title of the blog post.
date: 2022-02-01T22:07:18-06:00 # Date of post creation.
# lastmod: 2022-02-01T10:58:57-06:00 # Date when last modified
description: "The Tanzu Community Edition documentation does a great job of explaining how to authenticate to a newly-deployed cluster at the tail end of the installation steps, but how do you log in from another system once it's set up?" # Description used for search engine.
featured: false # Sets if post is a featured post, making appear on the home page side bar.
draft: false # Sets whether to render this page. Draft of true will not be rendered.
toc: false # Controls if a table of contents should be generated for first-level links automatically.
usePageBundles: true
# menu: main
featureImage: "tanzu.png" # Sets featured image on blog post.
# featureImageAlt: 'Description of image' # Alternative text for featured image.
# featureImageCap: 'This is the featured image.' # Caption (optional).
thumbnail: "tanzu.png" # Sets thumbnail image appearing inside card on homepage.
# shareImage: "share.png" # Designate a separate image for social media sharing.
codeLineNumbers: false # Override global value for showing of line numbers within code block.
series: Tips
tags:
  - vmware
  - kubernetes
  - tanzu
comment: true # Disable comment if false.
---
When I [set up my Tanzu Community Edition environment](/tanzu-community-edition-k8s-homelab/), I did so from a Linux VM since the containerized Linux environment on my Chromebook doesn't support the `kind` bootstrap cluster used for the deployment. But now that the Kubernetes cluster is up and running, I'd like to be able to connect to it directly without the aid of a jumpbox. How do I get the appropriate cluster configuration over to my Chromebook?

The Tanzu CLI actually makes that pretty easy - once I figured out the appropriate incantation. I just needed to use the `tanzu management-cluster kubeconfig get` command on my Linux VM to export the `kubeconfig` of my management (`tce-mgmt`) cluster to a file:
```shell
tanzu management-cluster kubeconfig get --admin --export-file tce-mgmt-kubeconfig.yaml
```

I then used `scp` to pull the file from the VM into my local Linux environment, and proceeded to [install `kubectl`](/tanzu-community-edition-k8s-homelab/#kubectl-binary) and the [`tanzu` CLI](/tanzu-community-edition-k8s-homelab/#tanzu-cli) (making sure to also [enable shell auto-completion](/enable-tanzu-cli-auto-completion-bash-zsh/) along the way!).

Now I'm ready to import the configuration locally with `tanzu login` on my Chromebook:

```shell
❯ tanzu login --kubeconfig ~/projects/tanzu-homelab/tanzu-setup/tce-mgmt-kubeconfig.yaml --context tce-mgmt-admin@tce-mgmt --name tce-mgmt
✔  successfully logged in to management cluster using the kubeconfig tce-mgmt
```

{{% notice tip "Use the absolute path" %}}
Pass in the full path to the exported kubeconfig file. This will help the Tanzu CLI to load the correct config across future terminal sessions.
{{% /notice %}}

Even though that's just importing the management cluster it actually grants access to both the management and workload clusters:
```shell
❯ tanzu cluster list
  NAME      NAMESPACE  STATUS   CONTROLPLANE  WORKERS  KUBERNETES        ROLES   PLAN
  tce-work  default    running  1/1           1/1      v1.21.2+vmware.1  <none>  dev

❯ tanzu cluster get tce-work
  NAME      NAMESPACE  STATUS   CONTROLPLANE  WORKERS  KUBERNETES        ROLES
  tce-work  default    running  1/1           1/1      v1.21.2+vmware.1  <none>
ℹ

Details:

NAME                                                         READY  SEVERITY  REASON  SINCE  MESSAGE
/tce-work                                                    True                     24h
├─ClusterInfrastructure - VSphereCluster/tce-work            True                     24h
├─ControlPlane - KubeadmControlPlane/tce-work-control-plane  True                     24h
│ └─Machine/tce-work-control-plane-vc2pb                     True                     24h
└─Workers
  └─MachineDeployment/tce-work-md-0
    └─Machine/tce-work-md-0-687444b744-crc9q                 True                     24h

❯ tanzu management-cluster get
  NAME      NAMESPACE   STATUS   CONTROLPLANE  WORKERS  KUBERNETES        ROLES
  tce-mgmt  tkg-system  running  1/1           1/1      v1.21.2+vmware.1  management


Details:

NAME                                                         READY  SEVERITY  REASON  SINCE  MESSAGE
/tce-mgmt                                                    True                     23h
├─ClusterInfrastructure - VSphereCluster/tce-mgmt            True                     23h
├─ControlPlane - KubeadmControlPlane/tce-mgmt-control-plane  True                     23h
│ └─Machine/tce-mgmt-control-plane-7pwz7                     True                     23h
└─Workers
  └─MachineDeployment/tce-mgmt-md-0
    └─Machine/tce-mgmt-md-0-745b858d44-5llk5                 True                     23h


Providers:

  NAMESPACE                          NAME                    TYPE                    PROVIDERNAME  VERSION  WATCHNAMESPACE
  capi-kubeadm-bootstrap-system      bootstrap-kubeadm       BootstrapProvider       kubeadm       v0.3.23
  capi-kubeadm-control-plane-system  control-plane-kubeadm   ControlPlaneProvider    kubeadm       v0.3.23
  capi-system                        cluster-api             CoreProvider            cluster-api   v0.3.23
  capv-system                        infrastructure-vsphere  InfrastructureProvider  vsphere       v0.7.10
```

And I can then tell `kubectl` about the two clusters:
```shell
❯ tanzu management-cluster kubeconfig get tce-mgmt --admin
Credentials of cluster 'tce-mgmt' have been saved
You can now access the cluster by running 'kubectl config use-context tce-mgmt-admin@tce-mgmt'

❯ tanzu cluster kubeconfig get tce-work --admin
Credentials of cluster 'tce-work' have been saved
You can now access the cluster by running 'kubectl config use-context tce-work-admin@tce-work'
```

And sure enough, there are my contexts:
```shell
❯ kubectl config get-contexts
CURRENT   NAME                      CLUSTER    AUTHINFO         NAMESPACE
          tce-mgmt-admin@tce-mgmt   tce-mgmt   tce-mgmt-admin
*         tce-work-admin@tce-work   tce-work   tce-work-admin

❯ kubectl get nodes -o wide
NAME                             STATUS   ROLES                  AGE   VERSION            INTERNAL-IP     EXTERNAL-IP     OS-IMAGE                 KERNEL-VERSION   CONTAINER-RUNTIME
tce-work-control-plane-vc2pb     Ready    control-plane,master   23h   v1.21.2+vmware.1   192.168.1.132   192.168.1.132   VMware Photon OS/Linux   4.19.198-1.ph3   containerd://1.4.6
tce-work-md-0-687444b744-crc9q   Ready    <none>                 23h   v1.21.2+vmware.1   192.168.1.133   192.168.1.133   VMware Photon OS/Linux   4.19.198-1.ph3   containerd://1.4.6
```

Perfect, now I can get back to Tanzuing from my Chromebook without having to jump through a VM. (And, [thanks to Tailscale](/secure-networking-made-simple-with-tailscale/), I can even access my TCE resources remotely!)
