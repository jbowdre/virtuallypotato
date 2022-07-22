---
series: vRA8
date: "2021-08-25T00:00:00Z"
usePageBundles: true
tags:
- nsx
- cluster
- vra
- availability
- networking
title: Notes on vRA HA with NSX-ALB
---
This is going to be a pretty quick recap of the steps I recently took to convert a single-node instance of vRealize Automation 8.4.2 into a 3-node High-Availability vRA cluster behind a standalone NSX Advanced Load Balancer (without NSX being deployed in the environment). No screenshots or specific details since I ran through this in the lab at work and didn't capture anything along the way, and my poor NUC homelab struggles enough to run a single instance of memory-hogging vRA.

### Getting started with NSX-ALB
I found a lot of information on how to use NSX-ALB as a component of a broader NSX-equipped environment, but not a lot of detail on how to use the ALB *without* NSX - until I found [Rudi Martinsen's blog on the subject](https://rudimartinsen.com/2021/06/25/load-balancing-with-nsx-alb/). That turned out to be a great reference for the ALB configuration so be sure to check it out if you need more details than what I provide in this section. 

#### Download
NSX-ALB is/was formerly known as the Avi Vantage Controller, and downloads are available [here](https://portal.avipulse.vmware.com/software/vantage). You'll need to log in with your VMware Customer Connect account to access the download, and then grab the latest VMware Controller OVA. Be sure to make a note of the default password listed on the right-hand side since you'll need that to log in post-deployment.

#### Deploy
It's an OVA, so deploy it like an OVA. When you get to the "Customize template" stage, drop in valid data for the **Management Interface IP Address**, **Management Interface Subnet Mask**, and **Default Gateway** fields but leave everything else blank. Click on through to the end and watch the thing deploy. Once the deployment completes, power on the new VM and wait a little bit for it to configure itself and get ready for operation.

### Configure NSX-ALB
Point a browser to the NSX-ALB appliance's IP and log in as `admin` using the password you copied from the download page (I told you it would come in handy!). Once you're in, you'll be prompted to establish a passphrase (for backups and such) and provide DNS Resolver(s) and the DNS search domain. Set the SMTP option to "None" and leave the other options as the defaults.

I'd then recommend clicking the little Avi icon at the top right of the screen and using the **My Account** button to change the admin password to something that's not posted out on the internet. You know, for reasons.

#### Cloud
Go to **Infrastructure > Clouds** and click the pencil icon for *Default-Cloud*, then set the *Cloud Infrastructure Type* to "VMware". Input the credentials needed for connecting to your vCenter, and make sure the account has "Write" access so it can create the Service Engine VMs and whatnot.

Click over to the *Data Center* tab and point it to the virtual data center used in your vCenter. On the *Network* tab, select the network that will be used for management traffic. Also configure a subnet (in CIDR notation) and gateway, and add a small static IP address pool that can be assigned to the Service Engine nodes (I used something like `192.168.1.120-192.168.1.126`).

#### Networks
Once thats sorted, navigate to **Infrastructure > Cloud Resources > Networks**. You should already see the networks which were imported from vCenter; find the one you'll use for servers (like your pending vRA cluster) and click the pencil icon to edit it. Then click the **Add Subnet** button, define the subnet in CIDR format, and add a static IP pool as well. Also go ahead and select the *Default-Group* as the **Template Service Engine Group**.

Back on the Networks list, you should now see both your management and server network defined with IP pools for each.

#### IPAM profile
Now go to **Templates > Profiles > IPAM/DNS Profiles**, click the **Create** button at the top right, and select **IPAM Profile**. Give it a name, set **Type** to `Avi Vantage IPAM`, pick the appropriate Cloud, and then also select the Networks for which you created the IP pools earlier.

Then go back to **Infastructure > Clouds**, edit the Cloud, and select the IPAM Profile you just created.

#### Service Engine Group
Navigate to **Infrastructure > Cloud Resources > Service Engine Group** and edit the *Default-Group*. I left everything on the *Basic Settings* tab at the defaults. On the *Advanced* tab, I specified which vSphere cluster the Service Engines should be deployed to. And I left everything else with the default settings.

#### SSL Certificate
Hop over to **Templates > Security > SSL/TLS Certificates** and click **Create > Application Certificate**. Give the new cert a name and change the **Type** to `CSR` to generate a new signing request. Enter the **Common Name** you're going to want to use for the load balancer VIP (something like `vra`, perhaps?) and all the usual cert fields. Use the **Subject Alternate Name (SAN)** section at the bottom to add all the other components, like the individual vRA cluster members by both hostname and FQDN. I went ahead and included those IPs as well for good measure. 

| Name                 |
|----------------------|
| `vra.domain.local`   |
| `vra01.domain.local` |
| `vra01`              |
| `192.168.1.41`       |
| `vra02.domain.local` |
| `vra02`              |
| `192.168.1.42`       |
| `vra03.domain.local` |
| `vra03`              |
| `192.168.1.43`       |

Click **Save**. 

Click **Create** again, but this time select **Root/Intermediate CA Certificate** and upload/paste your CA's cert so it can be trusted. Save your work.

Back at the cert list, find your new application cert and click the pencil icon to edit it. Copy the **Certificate Signing Request** field and go get it signed by your CA. Be sure to grab the certificate chain (base64-encoded) as well if you can. Come back and paste in / upload your shiny new CA-signed certificate file.

#### Virtual Service
Now it's finally time to create the Virtual Service that will function as the load balancer front-end. Pop over to **Applications > Virtual Services** and click **Create Virtual Service > Basic Setup**. Give it a name and set the **Application Type** to `HTTPS`, which will automatically set the port and bind a default self-signed certificate. 

Click on the **Certificate** field and select the new cert you created above. Be sure to remove the default cert.

Tick the box to auto-allocate the IP(s), and select the appropriate network and subnet.

Add your vRA servers (current and future) by their IP addresses (`192.168.1.41`, `192.168.1.42`, `192.168.1.43`), and then click **Save**.

Now that the Virtual Service is created, make a note of the IP address assigned to the service and go add that to your DNS so that the name will resolve.

### Now do vRA
Log into LifeCycle Manager in a new browser tab/window. Make sure that you've mapped an *Install* product binary for your current version of vRA; the upgrade binary that you probably used to do your last update won't cut it. It's probably also a good idea to go make a snapshot of your vRA and IDM instances just in case.

#### Adding new certificate
In LCM, go to **Locker > Certificates** and select the option to **Import**. Switch back to the NSX-ALB tab and go to **Templates > Security > SSL/TLS Certificates**. Click the little down-arrow-in-a-circle "Export" icon next to the application certificate you created earlier. Copy the key section and paste that into LCM. Then open the file containing the certificate chain you got from your CA, copy its contents, and paste it into LCM as well. Do *not* try to upload a certificate file directly to LCM; that will fail unless the file includes both the cert and the private key and that's silly. 

Once the cert is successfully imported, go to the **Lifecycle Operations** component of LCM and navigate to the environment containing your vRA instance. Select the vRA product, hit the three-dot menu, and use the **Replace Certificate** option to replace the old and busted cert with the new HA-ready one. It will take a little bit for this to get applied. Don't move on until vRA services are back up.

#### Scale out vRA
Still on the vRA product page, click on the **+ Add Components** button. 

On the **Infrastructure** page, tell LCM where to put the new VRA VMs.

On the **Network** page, tell it which network configuration to use.

On the **Components** page, scroll down a bit and click on **(+) > vRealize Automation Secondary Node** - twice. That will reveal a new section labeled **Cluster Virtual IP**. Put in the FQDN you configured for the Virtual Service, and tick the box to terminate SSL at the load balancer. Then scroll on down and enter the details for the additional vRA nodes, making sure that the IP addresses match the servers you added to the Virtual Service configuration and that the FQDNs match what's in the SSL cert.

Click on through to do the precheck and ultimately kick off the deployment. It'll take a while, but you'll eventually be able to connect to the NSX-ALB at `vra.domain.local` and get passed along to one of your three cluster nodes.

Have fun!
