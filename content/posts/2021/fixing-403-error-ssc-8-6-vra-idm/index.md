---
series: vRA8
date: "2021-11-05T00:00:00Z"
thumbnail: 20211105_ssc_403.png
usePageBundles: true
tags:
- vmware
- vra
- lcm
- salt
- openssl
- certs
title: Fixing 403 error on SaltStack Config 8.6 integrated with vRA and vIDM
---
I've been wanting to learn a bit more about [SaltStack Config](https://www.vmware.com/products/vrealize-automation/saltstack-config.html) so I recently deployed SSC 8.6 to my environment (using vRealize Suite Lifecycle Manager to do so as [described here](https://cosmin.gq/2021/02/02/deploying-saltstack-config-via-lifecycle-manager-in-a-vra-environment/)). I selected the option to integrate with my pre-existing vRA and vIDM instances so that I wouldn't have to manage authentication directly since I recall that the LDAP authentication piece was a little clumsy the last time I tried it.

### The Problem
Unfortunately I ran into a problem immediately after the deployment completed:
![403 error from SSC](20211105_ssc_403.png)

Instead of being redirected to the vIDM authentication screen, I get a 403 Forbidden error.

I used SSH to log in to the SSC appliance as `root`, and I found this in the `/var/log/raas/raas` log file:
```
2021-11-05 18:37:47,705 [var.lib.raas.unpack._MEIV8zDs3.raas.mods.vra.params               ][ERROR   :252 ][Webserver:6170] SSL Exception - https://vra.lab.bowdre.net/csp/gateway/am/api/auth/discovery may be using a self-signed certificate HTTPSConnectionPool(host='vra.lab.bowdre.net', port=443): Max retries exceeded with url: /csp/gateway/am/api/auth/discovery?username=service_type&state=aHR0cHM6Ly9zc2MubGFiLmJvd2RyZS5uZXQvaWRlbnRpdHkvYXBpL2NvcmUvYXV0aG4vY3Nw&redirect_uri=https%3A%2F%2Fssc.lab.bowdre.net%2Fidentity%2Fapi%2Fcore%2Fauthn%2Fcsp&client_id=ssc-299XZv71So (Caused by SSLError(SSLCertVerificationError(1, '[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: self signed certificate in certificate chain (_ssl.c:1076)')))
2021-11-05 18:37:47,928 [tornado.application                                               ][ERROR   :1792][Webserver:6170] Uncaught exception GET /csp/gateway/am/api/loggedin/user/profile (192.168.1.100)
HTTPServerRequest(protocol='https', host='ssc.lab.bowdre.net', method='GET', uri='/csp/gateway/am/api/loggedin/user/profile', version='HTTP/1.1', remote_ip='192.168.1.100')
Traceback (most recent call last):
  File "urllib3/connectionpool.py", line 706, in urlopen
  File "urllib3/connectionpool.py", line 382, in _make_request
  File "urllib3/connectionpool.py", line 1010, in _validate_conn
  File "urllib3/connection.py", line 421, in connect
  File "urllib3/util/ssl_.py", line 429, in ssl_wrap_socket
  File "urllib3/util/ssl_.py", line 472, in _ssl_wrap_socket_impl
  File "ssl.py", line 423, in wrap_socket
  File "ssl.py", line 870, in _create
  File "ssl.py", line 1139, in do_handshake
ssl.SSLCertVerificationError: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: self signed certificate in certificate chain (_ssl.c:1076)
```

Further, attempting to pull down that URL with `curl` also failed:
```sh
root@ssc [ ~ ]# curl https://vra.lab.bowdre.net/csp/gateway/am/api/auth/discovery
curl: (60) SSL certificate problem: self signed certificate in certificate chain
More details here: https://curl.se/docs/sslcerts.html

curl failed to verify the legitimacy of the server and therefore could not
establish a secure connection to it. To learn more about this situation and
how to fix it, please visit the web page mentioned above.
```

In my homelab, I am indeed using self-signed certificates. I also encountered the same issue in my lab at work, though, and I'm using certs issued by our enterprise CA there. I had run into a similar problem with previous versions of SSC, but the [quick-and-dirty workaround to disable certificate verification](https://communities.vmware.com/t5/VMware-vRealize-Discussions/SaltStack-Config-Integration-show-Blank-Page/td-p/2863973) doesn't seem to work anymore.

### The Solution
Clearly I needed to import either the vRA system's certificate (for my homelab) or the certificate chain for my enterprise CA (for my work environment) into SSC's certificate store so that it will trust vRA. But how? 

I fumbled around for a bit and managed to get the required certs added to the system certificate store so that my `curl` test would succeed, but trying to access the SSC web UI still gave me a big middle finger. I eventually found [this documentation](https://docs.vmware.com/en/VMware-vRealize-Automation-SaltStack-Config/8.6/install-configure-saltstack-config/GUID-21A87CE2-8184-4F41-B71B-0FCBB93F21FC.html#troubleshooting-saltstack-config-environments-with-vrealize-automation-that-use-selfsigned-certificates-3) which describes how to configure SSC to work with self-signed certs, and it held the missing detail of how to tell the SaltStack Returner-as-a-Service (RaaS) component that it should use that system certificate store.

So here's what I did to get things working in my homelab:
1. Point a browser to my vRA instance, click on the certificate error to view the certificate details, and then export the _CA_ certificate to a local file. (For a self-signed cert issued by LCM, this will likely be called something like `Automatically generated one-off CA authority for vRA`.)
![Exporting the self-signed CA cert](20211105_export_selfsigned_ca.png)
2. Open the file in a text editor, and copy the contents into a new file on the SSC appliance. I used `~/vra.crt`.
3. Append the certificate to the end of the system `ca-bundle.crt`:
```sh
cat <vra.crt >> /etc/pki/tls/certs/ca-bundle.crt
```
4. Test that I can now `curl` from vRA without a certificate error:
```sh
root@ssc [ ~ ]# curl https://vra.lab.bowdre.net/csp/gateway/am/api/auth/discovery
{"timestamp":1636139143260,"type":"CLIENT_ERROR","status":"400 BAD_REQUEST","error":"Bad Request","serverMessage":"400 BAD_REQUEST \"Required String parameter 'state' is not present\""}
```
5. Edit `/usr/lib/systemd/system/raas.service` to update the service definition so it will look to the `ca-bundle.crt` file by adding 
```
Environment=REQUESTS_CA_BUNDLE=/etc/pki/tls/certs/ca-bundle.crt
```
above the `ExecStart` line:
```sh
root@ssc [ ~ ]# cat /usr/lib/systemd/system/raas.service 
[Unit]
Description=The SaltStack Enterprise API Server
After=network.target
[Service]
Type=simple
User=raas
Group=raas
# to be able to bind port < 1024
AmbientCapabilities=CAP_NET_BIND_SERVICE
NoNewPrivileges=yes
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX AF_NETLINK
PermissionsStartOnly=true
ExecStartPre=/bin/sh -c 'systemctl set-environment FIPS_MODE=$(/opt/vmware/bin/ovfenv -q --key fips-mode)'
ExecStartPre=/bin/sh -c 'systemctl set-environment NODE_TYPE=$(/opt/vmware/bin/ovfenv -q --key node-type)'
Environment=REQUESTS_CA_BUNDLE=/etc/pki/tls/certs/ca-bundle.crt
ExecStart=/usr/bin/raas
TimeoutStopSec=90
[Install]
WantedBy=multi-user.target
```
6. Stop and restart the `raas` service:
```sh
systemctl daemon-reload
systemctl stop raas
systemctl start raas
```
7. And then try to visit the SSC URL again. This time, it redirects successfully to vIDM:
![Successful vIDM redirect](20211105_vidm_login.png)
8. Log in and get salty:
![Get salty!](20211105_get_salty.png)

The steps for doing this at work with an enterprise CA were pretty similar, with just slightly-different steps 1 and 2:
1. Access the enterprise CA and download the CA chain, which came in `.p7b` format.
2. Use `openssl` to extract the individual certificates:
```sh
openssl pkcs7 -inform PEM -outform PEM -in enterprise-ca-chain.p7b -print_certs > enterprise-ca-chain.pem
```
Copy it to the SSC appliance, and then pick up with Step 3 above.

I'm eager to dive deeper with SSC and figure out how best to leverage it with vRA. I'll let you know if/when I figure out any cool tricks!

In the meantime, maybe my struggles today can help you get past similar hurdles in your SSC deployments.