---
series: Tips
date: "2021-01-30T08:34:30Z"
thumbnail: XTaU9VDy8.png
usePageBundles: true
tags:
- vmware
title: 'PSA: halt replication before snapshotting linked vCenters'
toc: false
---

It's a good idea to take a snapshot of your virtual appliances before applying any updates, just in case. When you have multiple vCenter appliances operating in Enhanced Link Mode, though, it's important to make sure that the snapshots are in a consistent state. The vCenter `vmdird` service is responsible for continuously syncing data between the vCenters within a vSphere Single Sign-On (SSO) domain. Reverting to a snapshot where `vmdird`'s knowledge of the environment dramatically differed from that of the other vCenters could cause significant problems down the road or even result in having to rebuild a vCenter from scratch. 

*(Yes, that's a lesson I learned the hard way - and warnings about that are tragically hard to come by from what I've seen. So I'm sharing my notes so that you can avoid making the same mistake.)*

![Viewing replication status of linked vCenters](XTaU9VDy8.png)

Take these steps when you need to snapshot linked vCenters to avoid breaking replication:

1. Open an SSH session to *all* the vCenters within the SSO domain.
2. Log in and enter `shell` to access the shell on each vCenter.
3. Verify that replication is healthy by running `/usr/lib/vmware-vmdir/bin/vdcrepadmin -f showpartnerstatus -h localhost -u administrator -w [SSO_ADMIN_PASSWORD]` on each vCenter. You want to ensure that each host shows as available to all other hosts, and the message that `Partner is 0 changes behind.`:

    ```shell
    root@vcsa [ ~ ]# /usr/lib/vmware-vmdir/bin/vdcrepadmin -f showpartnerstatus -h localhost -u administrator -w $ssoPass 
    Partner: vcsa2.lab.bowdre.net
    Host available:   Yes
    Status available: Yes
    My last change number:             9346
    Partner has seen my change number: 9346
    Partner is 0 changes behind.

    root@vcsa2 [ ~ ]# /usr/lib/vmware-vmdir/bin/vdcrepadmin -f showpartnerstatus -h localhost -u administrator -w $ssoPass 
    Partner: vcsa.lab.bowdre.net
    Host available:   Yes
    Status available: Yes
    My last change number:             9518
    Partner has seen my change number: 9518
    Partner is 0 changes behind.
    ```
4. Stop `vmdird` on each vCenter by running `/bin/service-control --stop vmdird`:

    ```shell
    root@vcsa [ ~ ]# /bin/service-control --stop vmdird
    Operation not cancellable. Please wait for it to finish...
    Performing stop operation on service vmdird...
    Successfully stopped service vmdird

    root@vcsa2 [ ~ ]# /bin/service-control --stop vmdird
    Operation not cancellable. Please wait for it to finish...
    Performing stop operation on service vmdird...
    Successfully stopped service vmdird
    ```
5. Snapshot the vCenter appliance VMs.
6. Start replication on each server again with `/bin/service-control --start vmdird`:

    ```shell
    root@vcsa [ ~ ]# /bin/service-control --start vmdird
    Operation not cancellable. Please wait for it to finish...
    Performing start operation on service vmdird...
    Successfully started service vmdird

    root@vcsa2 [ ~ ]# /bin/service-control --start vmdird
    Operation not cancellable. Please wait for it to finish...
    Performing start operation on service vmdird...
    Successfully started service vmdird
    ```
7. Check the replication status with `/usr/lib/vmware-vmdir/bin/vdcrepadmin -f showpartnerstatus -h localhost -u administrator -w [SSO_ADMIN_PASSWORD]` again just to be sure. Don't proceed with whatever else you were planning to do until you've confirmed that the vCenters are in sync.

You can learn more about the `vdcrepadmin` utility here:
https://kb.vmware.com/s/article/2127057