---
series: vRA8
date: "2021-04-19T08:34:30Z"
thumbnail: K6vcxpDj8.png
usePageBundles: true
lastmod: "2021-10-01"
tags:
- vmware
- vra
- vro
- javascript
- powershell
title: 'vRA8 Custom Provisioning: Part Three'
---

Picking up after [Part Two](/vra8-custom-provisioning-part-two), I now have a pretty handy vRealize Orchestrator workflow to generate unique hostnames according to a defined naming standard. It even checks against the vSphere inventory to validate the uniqueness. Now I'm going to take it a step (or two, rather) further and extend those checks against Active Directory and DNS.

### Active Directory
#### Adding an AD endpoint
Remember how I [used the built-in vSphere plugin](/vra8-custom-provisioning-part-two#interlude-connecting-vro-to-vcenter) to let vRO query my vCenter(s) for VMs with a specific name? And how that required first configuring the vCenter endpoint(s) in vRO? I'm going to take a very similar approach here.

So as before, I'll first need to run the preinstalled "Add an Active Directory server" workflow:
![Add an Active Directory server workflow](uUDJXtWKz.png)

I fill out the Connection tab like so:
![Connection tab](U6oMWDal2.png)
*I don't have SSL enabled on my homelab AD server so I left that unchecked.*

On the Authentication tab, I tick the box to use a shared session and specify the service account I'll use to connect to AD. It would be great for later steps if this account has the appropriate privileges to create/delete computer accounts at least within designated OUs.
![Authentication tab](7MfV-1uiO.png)

If you've got multiple AD servers, you can use the options on the Alternative Hosts tab to specify those, saving you from having to create a new configuration for each. I've just got the one AD server in my lab, though, so at this point I just hit Run.

Once it completes successfully, I can visit the Inventory section of the vRO interface to confirm that the new Active Directory endpoint shows up:
![New AD endpoint](vlnle_ekN.png)

#### checkForAdConflict Action
Since I try to keep things modular, I'm going to write a new vRO action within the `net.bowdre.utility` module called `checkForAdConflict` which can be called from the `Generate unique hostname` workflow. It will take in `computerName (String)` as an input and return a boolean `True` if a conflict is found or `False` if the name is available. 
![Action: checkForAdConflict](JT7pbzM-5.png)

It's basically going to loop through the Active Directory hosts defined in vRO and search each for a matching computer name. Here's the full code:

```js
// JavaScript: checkForAdConflict action
//    Inputs: computerName (String)
//    Outputs: (Boolean)

var adHosts = AD_HostManager.findAllHosts();
for each (var adHost in adHosts) {
    var computer = ActiveDirectory.getComputerAD(computerName,adHost);
    System.log("Searched AD for: " + computerName);
    if (computer) {
        System.log("Found: " + computer.name);
        return true;
    } else {
        System.log("No AD objects found.");
        return false;
    }
}
```

#### Adding it to the workflow
Now I can pop back over to my massive `Generate unique hostname` workflow and drop in a new scriptable task between the `check for VM name conflicts` and `return nextVmName` tasks. It will bring in `candidateVmName (String)` as well as `conflict (Boolean)` as inputs, return `conflict (Boolean)` as an output, and `errMsg (String)` will be used for exception handling. If `errMsg (String)` is thrown, the flow will follow the dashed red line back to the `conflict resolution` action.
![Action: check for AD conflict](iB1bjdC8C.png)

I'm using this as a scriptable task so that I can do a little bit of processing before I call the action I created earlier - namely, if `conflict (Boolean)` was already set, the task should skip any further processing. That does mean that I'll need to call the action by both its module and name using `System.getModule("net.bowdre.utility").checkForAdConflict(candidateVmName)`. So here's the full script:

```js
// JavaScript: check for AD conflict task
//    Inputs: candidateVmName (String), conflict (Boolean)
//    Outputs: conflict (Boolean)

if (conflict) {
    System.log("Existing conflict found, skipping AD check...")
} else {
    var result = System.getModule("net.bowdre.utility").checkForAdConflict(candidateVmName);
    // remember this returns 'true' if a conflict is encountered
    if (result == true) {
        conflict = true;
        errMsg = "Conflicting AD object found!"
        System.warn(errMsg)
        throw(errMsg)
    } else {
        System.log("No AD conflict found for " + candidateVmName)
    }
}
```

Cool, so that's the AD check in the bank. Onward to DNS!

### DNS
**[Update]** Thanks to a [kind commenter](https://github.com/jbowdre/jbowdre.github.io/issues/10#issuecomment-932541245), I've learned that my DNS-checking solution detailed below is somewhat unnecessarily complicated. I overlooked it at the time I was putting this together, but vRO _does_ provide a `System.resolveHostName()` function to easily perform DNS lookups. I've updated the [Adding it to the workflow](#adding-it-to-the-workflow-1) section below with the simplified script which eliminates the need for building an external script with dependencies and importing that as a vRO action, but I'm going to leave those notes in place as well in case anyone else (or Future John) might need to leverage a similar approach to solve another issue.

Seriously. Go ahead and skip to [here](#adding-it-to-the-workflow-1). 

#### The Challenge (Deprecated)
JavaScript can't talk directly to Active Directory on its own, but in the previous action I was able to leverage the AD plugin built into vRO to bridge that gap. Unfortunately ~~there isn't~~ _I couldn't find_ a corresponding pre-installed plugin that will work as a DNS client. vRO 8 does introduce support for using other languages like (cross-platform) PowerShell or Python instead of being restricted to just JavaScript... but I wasn't able to find an easy solution for querying DNS from those languages either without requiring external modules. (The cross-platform version of PowerShell doesn't include handy Windows-centric cmdlets like `Get-DnsServerResourceRecord`.)

So I'll have to get creative here.

#### The Solution (Deprecated)
Luckily, vRO does provide a way to import scripts bundled with their required modules, and I found the necessarily clues for doing that [here](https://docs.vmware.com/en/vRealize-Orchestrator/8.3/com.vmware.vrealize.orchestrator-using-client-guide.doc/GUID-3C0CEB11-4079-43DF-B134-08C1D62EE3A4.html). And I found a DNS client written for cross-platform PowerShell in the form of the [DnsClient-PS](https://github.com/rmbolger/DnsClient-PS) module. So I'll write a script locally, package it up with the DnsClient-PS module, and import it as a vRO action.

I start by creating a folder to store the script and needed module, and then I create the required `handler.ps1` file.

```shell
❯ mkdir checkDnsConflicts
❯ cd checkDnsConflicts
❯ touch handler.ps1
```

I then create a `Modules` folder and install the DnsClient-PS module:

```shell
❯ mkdir Modules
❯ pwsh -c "Save-Module -Name DnsClient-PS -Path ./Modules/ -Repository PSGallery"
```

And then it's time to write the PowerShell script in `handler.ps1`:

```powershell
# PowerShell: checkForDnsConflict script
#    Inputs: $inputs.hostname (String), $inputs.domain (String)
#    Outputs: $queryresult (String)
#
# Returns true if a conflicting record is found in DNS.

Import-Module DnsClient-PS

function handler {
    Param($context, $inputs)
    $hostname = $inputs.hostname
    $domain = $inputs.domain
    $fqdn = $hostname + '.' + $domain
    Write-Host "Querying DNS for $fqdn..."
    $resolution = (Resolve-DNS $fqdn)
    If (-not $resolution.HasError) {
        Write-Host "Record found:" ($resolution | Select-Object -Expand Answers).ToString()
        $queryresult = "true"
    } Else {
        Write-Host "No record found."
        $queryresult = "false"
    }
    return $queryresult
}
```

Now to package it up in a `.zip` which I can then import into vRO:

```shell
❯ zip -r --exclude=\*.zip -X checkDnsConflicts.zip .
  adding: Modules/ (stored 0%)
  adding: Modules/DnsClient-PS/ (stored 0%)
  adding: Modules/DnsClient-PS/1.0.0/ (stored 0%)
  adding: Modules/DnsClient-PS/1.0.0/Public/ (stored 0%)
  adding: Modules/DnsClient-PS/1.0.0/Public/Set-DnsClientSetting.ps1 (deflated 67%)
  adding: Modules/DnsClient-PS/1.0.0/Public/Resolve-Dns.ps1 (deflated 67%)
  adding: Modules/DnsClient-PS/1.0.0/Public/Get-DnsClientSetting.ps1 (deflated 65%)
  adding: Modules/DnsClient-PS/1.0.0/lib/ (stored 0%)
  adding: Modules/DnsClient-PS/1.0.0/lib/DnsClient.1.3.1-netstandard2.0.xml (deflated 91%)
  adding: Modules/DnsClient-PS/1.0.0/lib/DnsClient.1.3.1-netstandard2.0.dll (deflated 57%)
  adding: Modules/DnsClient-PS/1.0.0/lib/System.Buffers.4.4.0-netstandard2.0.xml (deflated 72%)
  adding: Modules/DnsClient-PS/1.0.0/lib/System.Buffers.4.4.0-netstandard2.0.dll (deflated 44%)
  adding: Modules/DnsClient-PS/1.0.0/DnsClient-PS.psm1 (deflated 56%)
  adding: Modules/DnsClient-PS/1.0.0/Private/ (stored 0%)
  adding: Modules/DnsClient-PS/1.0.0/Private/Get-NameserverList.ps1 (deflated 68%)
  adding: Modules/DnsClient-PS/1.0.0/Private/Resolve-QueryOptions.ps1 (deflated 63%)
  adding: Modules/DnsClient-PS/1.0.0/Private/MockWrappers.ps1 (deflated 47%)
  adding: Modules/DnsClient-PS/1.0.0/PSGetModuleInfo.xml (deflated 73%)
  adding: Modules/DnsClient-PS/1.0.0/DnsClient-PS.Format.ps1xml (deflated 80%)
  adding: Modules/DnsClient-PS/1.0.0/DnsClient-PS.psd1 (deflated 59%)
  adding: handler.ps1 (deflated 49%)
❯ ls
checkDnsConflicts.zip  handler.ps1  Modules
```

#### checkForDnsConflict action (Deprecated)
And now I can go into vRO, create a new action called `checkForDnsConflict` inside my `net.bowdre.utilities` module. This time, I change the Language to `PowerCLI 12 (PowerShell 7.0)` and switch the Type to `Zip` to reveal the Import button.
![Preparing to import the zip](sjCtvoZA0.png)

Clicking that button lets me browse to the file I need to import. I can also set up the two input variables that the script requires, `hostname (String)` and `domain (String)`.
![Package imported and variables defined](xPvBx3oVX.png)

#### Adding it to the workflow
Just like with the `check for AD conflict` action, I'll add this onto the workflow as a scriptable task, this time between that action and the `return nextVmName` one. This will take `candidateVmName (String)`, `conflict (Boolean)`, and `requestProperties (Properties)` as inputs, and will return `conflict (Boolean)` as its sole output. The task will use `errMsg (String)` as its exception binding, which will divert flow via the dashed red line back to the `conflict resolution` task.

![Task: check for DNS conflict](uSunGKJfH.png)

_[Update] The below script has been altered to drop the unneeded call to my homemade `checkForDnsConflict` action and instead use the built-in `System.resolveHostName()`. Thanks @powertim!_

```js
// JavaScript: check for DNS conflict
//    Inputs: candidateVmName (String), conflict (Boolean), requestProperties (Properties)
//    Outputs: conflict (Boolean)

var domain = requestProperties.dnsDomain
if (conflict) {
    System.log("Existing conflict found, skipping DNS check...")
} else {
    if (System.resolveHostName(candidateVmName + "." + domain)) {
        conflict = true;
        errMsg = "Conflicting DNS record found!"
        System.warn(errMsg)
        throw(errMsg)
    } else {
        System.log("No DNS conflict for " + candidateVmName)
    }
}
```

### Testing
Once that's all in place, I kick off another deployment to make sure that everything works correctly. After it completes, I can navigate to the **Extensibility > Workflow runs** section of the vRA interface to review the details:
![Workflow run success](GZKQbELfM.png)

It worked! 

But what if there *had* been conflicts? It's important to make sure that works too. I know that if I run that deployment again, the VM will get named `DRE-DTST-XXX008` and then `DRE-DTST-XXX009`. So I'm going to force conflicts by creating an AD object for one and a DNS record for the other.
![Making conflicts](6HBIUf6KE.png)

And I'll kick off another deployment and see what happens.
![Workflow success even with conflicts](K6vcxpDj8.png)

The workflow saw that the last VM was created as `-007` so it first grabbed `-008`. It saw that `-008` already existed in AD so incremented up to try `-009`. The workflow then found that a record for `-009` was present in DNS so bumped it up to `-010`. That name finally passed through the checks and so the VM was deployed with the name `DRE-DTST-XXX010`. Success!

### Next steps
So now I've got a pretty capable workflow for controlled naming of my deployed VMs. The names conform with my established naming scheme and increment predictably in response to naming conflicts in vSphere, Active Directory, and DNS.

In the next post, I'll be enhancing my cloud template to let users pick which network to use for the deployed VM. That sounds simple, but I'll want the list of available networks to be filtered based on the selected site - that means using a Service Broker custom form to query another vRO action. I will also add the ability to create AD computer objects in a site-specific OU and automatically join the server to the domain. And I'll add notes to the VM to make it easier to remember why it was deployed. 

Stay tuned!
