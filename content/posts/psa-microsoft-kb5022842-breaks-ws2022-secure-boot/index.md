---
title: "PSA: Microsoft's KB5022842 breaks Windows Server 2022 VMs with Secure Boot" # Title of the blog post.
date: 2023-02-17T12:24:48-06:00 # Date of post creation.
lastmod: 2023-02-21
description: "Quick warning about a problematic patch from Microsoft, and a PowerCLI script to expose the potential impact in your vSphere environment." # Description used for search engine.
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
  - vmware
  - powershell
  - windows
  - powercli
comment: true # Disable comment if false.
---
{{% notice info "Fix available" %}}
VMware has released a fix for this problem in the form of [ESXi 7.0 Update 3k](https://docs.vmware.com/en/VMware-vSphere/7.0/rn/vsphere-esxi-70u3k-release-notes.html#resolvedissues):
>  If you already face the issue, after patching the host to ESXi 7.0 Update 3k, just power on the affected Windows Server 2022 VMs. After you patch a host to ESXi 7.0 Update 3k, you can migrate a running Windows Server 2022 VM from a host of version earlier than ESXi 7.0 Update 3k, install KB5022842, and the VM boots properly without any additional steps required.
{{% /notice %}}

Microsoft released [a patch](https://msrc.microsoft.com/update-guide/releaseNote/2023-Feb) this week for Windows Server 2022 that might cause some [big problems](https://support.microsoft.com/en-gb/topic/february-14-2023-kb5022842-os-build-20348-1547-be155955-29f7-47c4-855c-34bd43895940#known-issues-in-this-update:~:text=Known%20issues%20in%20this%20update) in VMware environments. Per [VMware's KB90947](https://kb.vmware.com/s/article/90947):
> After installing Windows Server 2022 update KB5022842 (OS Build 20348.1547), guest OS can not boot up when virtual machine(s) configured with secure boot enabled running on vSphere ESXi 6.7 U2/U3 or vSphere ESXi 7.0.x.
>
> Currently there is no resolution for virtual machines running on vSphere ESXi 6.7 U2/U3 and vSphere ESXi 7.0.x. However the issue doesn't exist with virtual machines running on vSphere ESXi 8.0.x.

So yeah. That's, uh, *not great.*

If you've got any **Windows Server 2022** VMs with **[Secure Boot](https://docs.vmware.com/en/VMware-vSphere/7.0/com.vmware.vsphere.security.doc/GUID-898217D4-689D-4EB5-866C-888353FE241C.html)** enabled on **ESXi 6.7/7.x**, you'll want to make sure they *do not* get **KB5022842** until this problem is resolved.

I put together a quick PowerCLI query to help identify impacted VMs in my environment:
```powershell
$secureBoot2022VMs = foreach($datacenter in (Get-Datacenter)) {
  $datacenter | Get-VM |
    Where-Object {$_.Guest.OsFullName -Match 'Microsoft Windows Server 2022' -And $_.ExtensionData.Config.BootOptions.EfiSecureBootEnabled} |
      Select-Object @{N="Datacenter";E={$datacenter.Name}},
        Name,
        @{N="Running OS";E={$_.Guest.OsFullName}},
        @{N="Secure Boot";E={$_.ExtensionData.Config.BootOptions.EfiSecureBootEnabled}},
        PowerState
}
$secureBoot2022VMs | Export-Csv -NoTypeInformation -Path ./secureBoot2022VMs.csv
```

Be careful out there!
