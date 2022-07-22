---
series: vRA8
date: "2021-09-03T00:00:00Z"
thumbnail: 20210903_action_run_success.png
usePageBundles: true
lastmod: "2021-09-20"
tags:
- vra
- abx
- powershell
- vmware
title: Run scripts in guest OS with vRA ABX Actions
---
Thus far in my [vRealize Automation project](/series/vra8), I've primarily been handing the payload over to vRealize Orchestrator to do the heavy lifting on the back end. This approach works really well for complex multi-part workflows (like when [generating unique hostnames](/vra8-custom-provisioning-part-two#the-vro-workflow)), but it may be overkill for more linear tasks (such as just running some simple commands inside of a deployed guest OS). In this post, I'll explore how I use [vRA Action Based eXtensibility (ABX)](https://blogs.vmware.com/management/2020/09/vra-abx-flow.html) to do just that.

### The Goal
My ABX action is going to use PowerCLI to perform a few steps inside a deployed guest OS (Windows-only for this demonstration):
1. Auto-update VM tools (if needed).
2. Add specified domain users/groups to the local Administrators group.
3. Extend the C: volume to fill the VMDK.
4. Set up Windows Firewall to enable remote access.
5. Create a scheduled task to attempt to automatically apply any available Windows updates.

### Template Changes
#### Cloud Assembly
I'll need to start by updating the cloud template so that the requester can input an (optional) list of admin accounts to be added to the VM, and to enable specifying a disk size to override the default from the source VM template.

I will also add some properties to tell PowerCLI (and the `Invoke-VmScript` cmdlet in particular) how to connect to the VM.

##### Inputs section
I'll kick this off by going into Cloud Assembly and editing the `WindowsDemo` template I've been working on for the past few eons. I'll add a `diskSize` input:
```yaml
formatVersion: 1
inputs:
  site: [...]
  image: [...]
  size: [...]
  diskSize:
    title: 'System drive size'
    default: 60
    type: integer
    minimum: 60
    maximum: 200
  network: [...]
  adJoin: [...]
[...]
```

The default value is set to 60GB to match the VMDK attached to the source template; that's also the minimum value since shrinking disks gets messy. 

I'll also drop in an `adminsList` input at the bottom of the section:
```yaml
[...]
  poc_email: [...]
  ticket: [...]
  adminsList: 
    type: string
    title: Administrators
    description: Comma-separated list of domain accounts/groups which need admin access to this server.
    default: ''
resources:
  Cloud_vSphere_Machine_1:
[...]
```

##### Resources section
In the Resources section of the cloud template, I'm going to add a few properties that will tell the ABX script how to connect to the appropriate vCenter and then the VM. 
- `vCenter`: The vCenter server where the VM will be deployed, and thus the server which PowerCLI will authenticate against. In this case, I've only got one vCenter, but a larger environment might have multiples. Defining this in the cloud template makes it easy to select automagically if needed. (For instance, if I had a `bow-vcsa` and a `dre-vcsa` for my different sites, I could do something like `vCenter: '${input.site}-vcsa.lab.bowdre.net'` here.)
- `vCenterUser`: The username with rights to the VM in vCenter. Again, this doesn't have to be a static assignment.
- `templateUser`: This is the account that will be used by `Invoke-VmScript` to log in to the guest OS. My template will use the default `Administrator` account for non-domain systems, but the `lab\vra` service account on domain-joined systems (using the `adJoin` input I [set up earlier](/joining-vms-to-active-directory-in-site-specific-ous-with-vra8#cloud-template)).

I'll also include the `adminsList` input from earlier so that can get passed to ABX as well. And I'm going to add in an `adJoin` property (mapped to the [existing `input.adJoin`](/joining-vms-to-active-directory-in-site-specific-ous-with-vra8#cloud-template)) so that I'll have that to work with later.

```yaml
[...]
resources:
  Cloud_vSphere_Machine_1:
    type: Cloud.vSphere.Machine
    properties:
      image: '${input.image}'
      flavor: '${input.size}'
      site: '${input.site}'
      vCenter: vcsa.lab.bowdre.net
      vCenterUser: vra@lab.bowdre.net
      templateUser: '${input.adJoin ? "vra@lab" : "Administrator"}'
      adminsList: '${input.adminsList}'
      environment: '${input.environment}'
      function: '${input.function}'
      app: '${input.app}'
      adJoin: '${input.adJoin}'
      ignoreActiveDirectory: '${!input.adJoin}'
[...]      
```

And I will add in a `storage` property as well which will automatically adjust the deployed VMDK size to match the specified input:
```yaml
[...]
      description: '${input.description}'
      networks: [...]
      constraints: [...]
      storage:
        bootDiskCapacityInGB: '${input.diskSize}'
  Cloud_vSphere_Network_1:
    type: Cloud.vSphere.Network
    properties: [...]
[...]
```

##### Complete template
Okay, all together now:
```yaml
formatVersion: 1
inputs:
  site:
    type: string
    title: Site
    enum:
      - BOW
      - DRE
  image:
    type: string
    title: Operating System
    oneOf:
      - title: Windows Server 2019
        const: ws2019
    default: ws2019
  size:
    title: Resource Size
    type: string
    oneOf:
      - title: 'Micro [1vCPU|1GB]'
        const: micro
      - title: 'Tiny [1vCPU|2GB]'
        const: tiny
      - title: 'Small [2vCPU|2GB]'
        const: small
    default: small
  diskSize:
    title: 'System drive size'
    default: 60
    type: integer
    minimum: 60
    maximum: 200
  network:
    title: Network
    type: string
  adJoin:
    title: Join to AD domain
    type: boolean
    default: true
  staticDns:
    title: Create static DNS record
    type: boolean
    default: false
  environment:
    type: string
    title: Environment
    oneOf:
      - title: Development
        const: D
      - title: Testing
        const: T
      - title: Production
        const: P
    default: D
  function:
    type: string
    title: Function Code
    oneOf:
      - title: Application (APP)
        const: APP
      - title: Desktop (DSK)
        const: DSK
      - title: Network (NET)
        const: NET
      - title: Service (SVS)
        const: SVS
      - title: Testing (TST)
        const: TST
    default: TST
  app:
    type: string
    title: Application Code
    minLength: 3
    maxLength: 3
    default: xxx
  description:
    type: string
    title: Description
    description: Server function/purpose
    default: Testing and evaluation
  poc_name:
    type: string
    title: Point of Contact Name
    default: Jack Shephard
  poc_email:
    type: string
    title: Point of Contact Email
    default: jack.shephard@virtuallypotato.com
    pattern: '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  ticket:
    type: string
    title: Ticket/Request Number
    default: 4815162342
  adminsList: 
    type: string
    title: Administrators
    description: Comma-separated list of domain accounts/groups which need admin access to this server.
    default: ''
resources:
  Cloud_vSphere_Machine_1:
    type: Cloud.vSphere.Machine
    properties:
      image: '${input.image}'
      flavor: '${input.size}'
      site: '${input.site}'
      vCenter: vcsa.lab.bowdre.net
      vCenterUser: vra@lab.bowdre.net
      templateUser: '${input.adJoin ? "vra@lab" : "Administrator"}'
      adminsList: '${input.adminsList}'
      environment: '${input.environment}'
      function: '${input.function}'
      app: '${input.app}'
      adJoin: '${input.adJoin}'
      ignoreActiveDirectory: '${!input.adJoin}'
      activeDirectory:
        relativeDN: '${"OU=Servers,OU=Computers,OU=" + input.site + ",OU=LAB"}'
      customizationSpec: '${input.adJoin ? "vra-win-domain" : "vra-win-workgroup"}'
      staticDns: '${input.staticDns}'
      dnsDomain: lab.bowdre.net
      poc: '${input.poc_name + " (" + input.poc_email + ")"}'
      ticket: '${input.ticket}'
      description: '${input.description}'
      networks:
        - network: '${resource.Cloud_vSphere_Network_1.id}'
          assignment: static
      constraints:
        - tag: 'comp:${to_lower(input.site)}'
      storage:
        bootDiskCapacityInGB: '${input.diskSize}'
  Cloud_vSphere_Network_1:
    type: Cloud.vSphere.Network
    properties:
      networkType: existing
      constraints:
        - tag: 'net:${input.network}'
```

With the template sorted, I need to assign it a new version and release it to the catalog so that the changes will be visible to Service Broker:
![Releasing a new version of a Cloud Assembly template](20210831_cloud_assembly_new_version.png)

#### Service Broker custom form
I now need to also make some updates to the custom form configuration in Service Broker so that the new fields will appear on the request form. First things first, though: after switching to the Service Broker UI, I go to **Content & Policies > Content Sources**, open the linked content source, and click the **Save & Import** button to force Service Broker to pull in the latest versions from Cloud Assembly.

I can then go to **Content**, click the three-dot menu next to my `WindowsDemo` item, and select the **Customize Form** option. I drag-and-drop the `System drive size` from the *Schema Elements* section onto the canvas, placing it directly below the existing `Resource Size` field.
![Placing the system drive size field on the canvas](20210831_system_drive_size_placement.png)

With the field selected, I use the **Properties** section to edit the label with a unit so that users will better understand what they're requesting.
![System drive size label](20210831_system_drive_size_label.png)

On the **Values** tab, I change the *Step* option to `5` so that we won't wind up with users requesting a disk size of `62.357 GB` or anything crazy like that.
![System drive size step](20210831_system_drive_size_step.png)

I'll drag-and-drop the `Administrators` field to the canvas, and put it right below the VM description:
![Administrators field placement](20210831_administrators_placement.png)

I only want this field to be visible if the VM is going to be joined to the AD domain, so I'll set the *Visibility* accordingly:
![Administrators field visibility](20210831_administrators_visibility.png)

That should be everything I need to add to the custom form so I'll be sure to hit that big **Save** button before moving on.

### Extensibility
Okay, now it's time to actually make the stuff work on the back end. But before I get to writing the actual script, there's something else I'll need to do first. Remember how I added properties to store the usernames for vCenter and the VM template in the cloud template? My ABX action will also need to know the passwords for those accounts. I didn't add those to the cloud template since anything added as a property there (even if flagged as a secret!) would be visible in plain text to any external handlers (like vRO). Instead, I'll store those passwords as encrypted Action Constants.

#### Action Constants
From the vRA Cloud Assembly interface, I'll navigate to **Extensibility > Library > Actions** and then click the **Action Constants** button up top. I can then click **New Action Constant** and start creating the ones I need:
- `vCenterPassword`: for logging into vCenter.
- `templatePassWinWorkgroup`: for logging into non-domain VMs.
- `templatePassWinDomain`: for logging into VMs with the designated domain credentials.

I'll make sure to enable the *Encrypt the action constant value* toggle for each so they'll be protected.
![Creating an action constant](20210901_create_action_constant.png)

![Created action constants](20210901_action_constants.png)

Once all those constants are created I can move on to the meat of this little project:

#### ABX Action
I'll click back to **Extensibility > Library > Actions** and then **+ New Action**. I give the new action a clever title and description:
![Create a new action](20210901_create_action.png)]

I then hit the language dropdown near the top left and select to use `powershell` so that I can use those sweet, sweet PowerCLI cmdlets.
![Language selection](20210901_action_select_language.png)

And I'll pop over to the right side to map the Action Constants I created earlier so that I can reference them in the script I'm about to write:
![Mapping constants in action](20210901_map_constants_to_action.png)

Now for The Script:
```powershell
<# vRA 8.x ABX action to perform certain in-guest actions post-deploy:
    Windows:
        - auto-update VM tools
        - add specified domain users/groups to local Administrators group
        - extend C: volume to fill disk
        - set up remote access
        - create a scheduled task to (attempt to) apply Windows updates
    
    ## Action Secrets:
        templatePassWinDomain                   # password for domain account with admin rights to the template (domain-joined deployments)
        templatePassWinWorkgroup                # password for local account with admin rights to the template (standalone deployments)
        vCenterPassword                         # password for vCenter account passed from the cloud template
    
    ## Action Inputs:
    ## Inputs from deployment:
        resourceNames[0]                        # VM name [BOW-DVRT-XXX003]
        customProperties.vCenterUser            # user for connecting to vCenter [lab\vra]
        customProperties.vCenter                # vCenter instance to connect to [vcsa.lab.bowdre.net]
        customProperties.dnsDomain              # long-form domain name [lab.bowdre.net]
        customProperties.adminsList             # list of domain users/groups to be added as local admins [john, lab\vra, vRA-Admins]
        customProperties.adJoin                 # boolean to determine if the system will be joined to AD (true) or not (false)
        customProperties.templateUser           # username used for connecting to the VM through vmtools [Administrator] / [root]
#>

function handler($context, $inputs) {
    # Initialize global variables
    $vcUser = $inputs.customProperties.vCenterUser
    $vcPassword = $context.getSecret($inputs."vCenterPassword")
    $vCenter = $inputs.customProperties.vCenter
    
    # Create vmtools connection to the VM 
    $vmName = $inputs.resourceNames[0]
    Connect-ViServer -Server $vCenter -User $vcUser -Password $vcPassword -Force
    $vm = Get-VM -Name $vmName
    Write-Host "Waiting for VM Tools to start..."
    if (-not (Wait-Tools -VM $vm -TimeoutSeconds 180)) {
        Write-Error "Unable to establish connection with VM tools" -ErrorAction Stop
    }
    
    # Detect OS type
    $count = 0
    While (!$osType) {
        Try {
            $osType = ($vm | Get-View).Guest.GuestFamily.ToString()
            $toolsStatus = ($vm | Get-View).Guest.ToolsStatus.ToString()        
        } Catch {
            # 60s timeout
            if ($count -ge 12) {
                Write-Error "Timeout exceeded while waiting for tools." -ErrorAction Stop
                break
            }
            Write-Host "Waiting for tools..."
            $count++
            Sleep 5
        }
    }
    Write-Host "$vmName is a $osType and its tools status is $toolsStatus."
    
    # Update tools on Windows if out of date
    if ($osType.Equals("windowsGuest") -And $toolsStatus.Equals("toolsOld")) {
        Write-Host "Updating VM Tools..."
        Update-Tools $vm
        Write-Host "Waiting for VM Tools to start..."
        if (-not (Wait-Tools -VM $vm -TimeoutSeconds 180)) {
            Write-Error "Unable to establish connection with VM tools" -ErrorAction Stop
        }
    }
    
    # Run OS-specific tasks
    if ($osType.Equals("windowsGuest")) {
        # Initialize Windows variables
        $domainLong = $inputs.customProperties.dnsDomain
        $adminsList = $inputs.customProperties.adminsList
        $adJoin = $inputs.customProperties.adJoin
        $templateUser = $inputs.customProperties.templateUser
        $templatePassword = $adJoin.Equals("true") ? $context.getSecret($inputs."templatePassWinDomain") : $context.getSecret($inputs."templatePassWinWorkgroup")
      
        # Add domain accounts to local administrators group
        if ($adminsList.Length -gt 0 -And $adJoin.Equals("true")) {
            # Standardize users entered without domain as DOMAIN\username
            if ($adminsList.Length -gt 0) {
                $domainShort = $domainLong.split('.')[0]
                $adminsArray = @(($adminsList -Split ',').Trim())
                For ($i=0; $i -lt $adminsArray.Length; $i++) {
                    If ($adminsArray[$i] -notmatch "$domainShort.*\\" -And $adminsArray[$i] -notmatch "@$domainShort") {
                        $adminsArray[$i] = $domainShort + "\" + $adminsArray[$i]
                    }
            }
            $admins = '"{0}"' -f ($adminsArray -join '","')
            Write-Host "Administrators: $admins"
            }
            $adminScript = "Add-LocalGroupMember -Group Administrators -Member $admins"
            Start-Sleep -s 10
            Write-Host "Attempting to add administrator accounts..."
            $runAdminScript = Invoke-VMScript -VM $vm -ScriptText $adminScript -GuestUser $templateUser -GuestPassword $templatePassword
            if ($runAdminScript.ScriptOutput.Length -eq 0) {
                Write-Host "Successfully added [$admins] to Administrators group."
            } else {
                Write-Host "Attempt to add [$admins] to Administrators group completed with warnings:`n" $runAdminScript.ScriptOutput "`n"
            }
        } else {
            Write-Host "No admins to add..."
        }
        # Extend C: volume to fill system drive
        $partitionScript = "`$Partition = Get-Volume -DriveLetter C | Get-Partition; `$Partition | Resize-Partition -Size (`$Partition | Get-PartitionSupportedSize).sizeMax"
        Start-Sleep -s 10
        Write-Host "Attempting to extend system volume..."
        $runPartitionScript = Invoke-VMScript -VM $vm -ScriptText $partitionScript -GuestUser $templateUser -GuestPassword $templatePassword
        if ($runPartitionScript.ScriptOutput.Length -eq 0) {
            Write-Host "Successfully extended system partition."
        } else {
            Write-Host "Attempt to extend system volume completed with warnings:`n" $runPartitionScript.ScriptOutput "`n"
        }
        # Set up remote access
        $remoteScript = "Enable-NetFirewallRule -DisplayGroup `"Remote Desktop`"
            Enable-NetFirewallRule -DisplayGroup `"Windows Management Instrumentation (WMI)`"
            Enable-NetFirewallRule -DisplayGroup `"File and Printer Sharing`"
            Enable-PsRemoting
            Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' -name `"fDenyTSConnections`" -Value 0"
        Start-Sleep -s 10
        Write-Host "Attempting to enable remote access (RDP, WMI, File and Printer Sharing, PSRemoting)..."
        $runRemoteScript = Invoke-VMScript -VM $vm -ScriptText $remoteScript -GuestUser $templateUser -GuestPassword $templatePassword
        if ($runRemoteScript.ScriptOutput.Length -eq 0) {
            Write-Host "Successfully enabled remote access."
        } else {
            Write-Host "Attempt to enable remote access completed with warnings:`n" $runRemoteScript.ScriptOutput "`n"
        }
        # Create scheduled task to apply updates
        $updateScript = "`$action = New-ScheduledTaskAction -Execute 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe' -Argument '-NoProfile -WindowStyle Hidden -Command `"& {Install-WUUpdates -Updates (Start-WUScan)}`"'
            `$trigger = New-ScheduledTaskTrigger -Once -At ([DateTime]::Now.AddMinutes(1))
            `$settings = New-ScheduledTaskSettingsSet -Compatibility Win8 -Hidden
            Register-ScheduledTask -Action `$action -Trigger `$trigger -Settings `$settings -TaskName `"Initial_Updates`" -User `"NT AUTHORITY\SYSTEM`" -RunLevel Highest
            `$task = Get-ScheduledTask -TaskName `"Initial_Updates`"
            `$task.Triggers[0].StartBoundary = [DateTime]::Now.AddMinutes(1).ToString(`"yyyy-MM-dd'T'HH:mm:ss`")
            `$task.Triggers[0].EndBoundary = [DateTime]::Now.AddHours(3).ToString(`"yyyy-MM-dd'T'HH:mm:ss`")
            `$task.Settings.AllowHardTerminate = `$True
            `$task.Settings.DeleteExpiredTaskAfter = 'PT0S'
            `$task.Settings.ExecutionTimeLimit = 'PT2H'
            `$task.Settings.Volatile = `$False
            `$task | Set-ScheduledTask"
        Start-Sleep -s 10
        Write-Host "Creating a scheduled task to apply updates..."
        $runUpdateScript = Invoke-VMScript -VM $vm -ScriptText $updateScript -GuestUser $templateUser -GuestPassword $templatePassword
        Write-Host "Created task:`n" $runUpdateScript.ScriptOutput "`n"            
    } elseif ($osType.Equals("linuxGuest")) {
        #TODO
        Write-Host "Linux systems not supported by this action... yet"
    }
    # Cleanup connection
    Disconnect-ViServer -Server $vCenter -Force -Confirm:$false

}
```

I like to think that it's fairly well documented (but I've also been staring at / tweaking this for a while); here's the gist of what it's doing:
1. Capture vCenter login credentials from the Action Constants and the `customProperties` of the deployment (from the cloud template).
2. Use those creds to `Connect-ViServer` to the vCenter instance.
3. Find the VM object which matches the `resourceName` from the vRA deployment.
4. Wait for VM tools to be running and accessible on that VM.
5. Determine the OS type of the VM (Windows/Linux).
6. If it's Windows and the tools are out of date, update them and wait for the reboot to complete.
7. If it's Windows, move on:
8. If it needs to add accounts to the Administrators group, assemble the needed script and run it in the guest via `Invoke-VmScript`.
9. Assemble a script to expand the C: volume to fill whatever size VMDK is attached as HDD1, and run it in the guest via `Invoke-VmScript`.
10. Assemble a script to set common firewall exceptions for remote access, and run it in the guest via `Invoke-VmScript`.
11. Assemble a script to schedule a task to (attempt to) apply Windows updates, and run it in the guest via `Invoke-VmScript`.

It wouldn't be hard to customize the script to perform different actions (or even run against Linux systems - just set `$whateverScript = "apt update && apt upgrade"` (or whatever) and call it with `$runWhateverScript = Invoke-VMScript -VM $vm -ScriptText $whateverScript -GuestUser $templateUser -GuestPassword $templatePassword`), but this is as far as I'm going to take it for this demo.

#### Event subscription
Before I can test the new action, I'll need to first add an extensibility subscription so that the ABX action will get called during the deployment. So I head to **Extensibility > Subscriptions** and click the **New Subscription** button.
![Extensibility subscriptions](20210903_extensibility_subscriptions.png)

I'll be using this to call my new `configureGuest` action - so I'll name the subscription `Configure Guest`. I tie it to the `Compute Post Provision` event, and bind my action:
![Creating the new subscription](20210903_new_subscription_1.png)

I do have another subsciption on that event already, [`VM Post-Provisioning`](/adding-vm-notes-and-custom-attributes-with-vra8#extensibility-subscription) which is used to modify the VM object with notes and custom attributes. I'd like to make sure that my work inside the guest happens after that other subscription is completed, so I'll enable blocking and give it a priority of `2`:
![Adding blocking to Configure Guest](20210903_new_subscription_2.png)

After hitting the **Save** button, I go back to that other `VM Post-Provisioning` subscription, set it to enable blocking, and give it a priority of `1`:
![Blocking VM Post-Provisioning](20210903_old_subscription_blocking.png)

This will ensure that the new subscription fires after the older one completes, and that should avoid any conflicts between the two. 

### Testing
Alright, now let's see if it worked. I head into Service Broker to submit the deployment request:
![Submitting the test deployment](20210903_request.png)

Note that I've set the disk size to 65GB (up from the default of 60), and I'm adding `lab\testy` as a local admin on the deployed system.

Once the deployment finishes, I can switch back to Cloud Assembly and check **Extensibility > Activity > Action Runs** and then click on the `configureGuest` run to see how it did.
![Successful action run](20210903_action_run_success.png)

It worked!

The Log tab lets me see the progress as the execution progresses:

```
Logging in to server.
logged in to server vcsa.lab.bowdre.net:443
Read-only file system
09/03/2021 19:08:27	Get-VM	Finished execution
09/03/2021 19:08:27	Get-VM	
Waiting for VM Tools to start...
09/03/2021 19:08:29	Wait-Tools	5222b516-ae2c-5740-2926-77cd21441f27	
09/03/2021 19:08:29	Wait-Tools	Finished execution
09/03/2021 19:08:29	Wait-Tools	
09/03/2021 19:08:29	Get-View	Finished execution
09/03/2021 19:08:29	Get-View	
09/03/2021 19:08:29	Get-View	Finished execution
09/03/2021 19:08:29	Get-View	
BOW-PSVS-XXX001 is a windowsGuest and its tools status is toolsOld.
Updating VM Tools...
09/03/2021 19:08:30	Update-Tools	5222b516-ae2c-5740-2926-77cd21441f27	
09/03/2021 19:08:30	Update-Tools	Finished execution
09/03/2021 19:08:30	Update-Tools	
Waiting for VM Tools to start...
09/03/2021 19:09:00	Wait-Tools	5222b516-ae2c-5740-2926-77cd21441f27	
09/03/2021 19:09:00	Wait-Tools	Finished execution
09/03/2021 19:09:00	Wait-Tools	
Administrators: "lab\testy"
Attempting to add administrator accounts...
09/03/2021 19:09:10	Invoke-VMScript	5222b516-ae2c-5740-2926-77cd21441f27	
09/03/2021 19:09:10	Invoke-VMScript	Finished execution
09/03/2021 19:09:10	Invoke-VMScript	
Successfully added ["lab\testy"] to Administrators group.
Attempting to extend system volume...
09/03/2021 19:09:27	Invoke-VMScript	5222b516-ae2c-5740-2926-77cd21441f27	
09/03/2021 19:09:27	Invoke-VMScript	Finished execution
09/03/2021 19:09:27	Invoke-VMScript	
Successfully extended system partition.
Attempting to enable remote access (RDP, WMI, File and Printer Sharing, PSRemoting)...
09/03/2021 19:09:49	Invoke-VMScript	5222b516-ae2c-5740-2926-77cd21441f27	
09/03/2021 19:09:49	Invoke-VMScript	Finished execution
09/03/2021 19:09:49	Invoke-VMScript	
Successfully enabled remote access.
Creating a scheduled task to apply updates...
09/03/2021 19:10:12	Invoke-VMScript	5222b516-ae2c-5740-2926-77cd21441f27	
09/03/2021 19:10:12	Invoke-VMScript	Finished execution
09/03/2021 19:10:12	Invoke-VMScript	
Created task:
 
TaskPath                                       TaskName                          State     
--------                                       --------                          -----     
\                                              Initial_Updates                   Ready     
\                                              Initial_Updates                   Ready     
```

So it *claims* to have successfully updated the VM tools, added `lab\testy` to the local `Administrators` group, extended the `C:` volume to fill the 65GB virtual disk, added firewall rules to permit remote access, and created a scheduled task to apply updates. I can open a console session to the VM to spot-check the results.
![Verifying local admins](20210903_verify_local_admins.png)
Yep, `testy` is an admin now!

![Verify disk size](20210903_verify_disk_size.png)
And `C:` fills the disk!

### Wrap-up
This is really just the start of what I've been able to do in-guest leveraging `Invoke-VmScript` from an ABX action. I've got a [slightly-larger version of this script](https://github.com/jbowdre/misc-scripts/blob/main/vRealize/configure_guest.ps1) which also performs similar actions in Linux guests as well. And I've also cobbled together ABX solutions for generating randomized passwords for local accounts and storing them in an organization's password management solution. I would like to get around to documenting those here in the future... we'll see.

In any case, hopefully this information might help someone else to get started down this path. I'd love to see whatever enhancements you are able to come up with!
