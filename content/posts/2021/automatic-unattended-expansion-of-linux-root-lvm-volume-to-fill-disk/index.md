---
series: Scripts
date: "2021-04-29T08:34:30Z"
usePageBundles: true
thumbnail: 20210723-script.png
tags:
- linux
- shell
- automation
title: Automatic unattended expansion of Linux root LVM volume to fill disk
toc: false
---

While working on my [vRealize Automation 8 project](/series/vra8), I wanted to let users specify how large a VM's system drive should be and have vRA apply that without any further user intervention. For instance, if the template has a 60GB C: drive and the user specifies that they want it to be 80GB, vRA will embiggen the new VM's VMDK to 80GB and then expand the guest file system to fill up the new free space.

I'll get into the details of how that's implemented from the vRA side #soon, but first I needed to come up with simple scripts to extend the guest file system to fill the disk.

This was pretty straight-forward on Windows with a short PowerShell script to grab the appropriate volume and resize it to its full capacity:
```powershell
$Partition = Get-Volume -DriveLetter C | Get-Partition
$Partition | Resize-Partition -Size ($Partition | Get-PartitionSupportedSize).sizeMax
```

It was a bit trickier for Linux systems though. My Linux templates all use LVM to abstract the file systems away from the physical disks, but they may have a different number of physical partitions or different names for the volume groups and logical volumes. So I needed to be able to automagically determine which logical volume was mounted as `/`, which volume group it was a member of, and which partition on which disk is used for that physical volume. I could then expand the physical partition to fill the disk, expand the volume group to fill the now-larger physical volume, grow the logical volume to fill the volume group, and (finally) extend the file system to fill the logical volume. 

I found a great script [here](https://github.com/alpacacode/Homebrewn-Scripts/blob/master/linux-scripts/partresize.sh) that helped with most of those operations, but it required the user to specify the physical and logical volumes. I modified it to auto-detect those, and here's what I came up with:

{{% notice info "MBR only" %}}
When I cobbled together this script I was primarily targeting the Enterprise Linux (RHEL, CentOS) systems that I work with in my environment, and those happened to have MBR partition tables. This script would need to be modified a bit to work with GPT partitions like you might find on Ubuntu.
{{% /notice %}}

```shell
#!/bin/bash
# This will attempt to automatically detect the LVM logical volume where / is mounted and then 
# expand the underlying physical partition, LVM physical volume, LVM volume group, LVM logical
# volume, and Linux filesystem to consume new free space on the disk. 
# Adapted from https://github.com/alpacacode/Homebrewn-Scripts/blob/master/linux-scripts/partresize.sh

extenddisk() {
    echo -e "\n+++Current partition layout of $disk:+++"
    parted $disk --script unit s print
    if [ $logical == 1 ]; then
        parted $disk --script rm $ext_partnum
        parted $disk --script "mkpart extended ${ext_startsector}s -1s"
        parted $disk --script "set $ext_partnum lba off"
        parted $disk --script "mkpart logical ext2 ${startsector}s -1s"
    else
        parted $disk --script rm $partnum
        parted $disk --script "mkpart primary ext2 ${startsector}s -1s"
    fi
    parted $disk --script set $partnum lvm on
    echo -e "\n\n+++New partition layout of $disk:+++"
    parted $disk --script unit s print
    partx -v -a $disk
    pvresize $pvname
    lvextend --extents +100%FREE --resize $lvpath 
    echo -e "\n+++New root partition size:+++"
    df -h / | grep -v Filesystem
}
export LVM_SUPPRESS_FD_WARNINGS=1
mountpoint=$(df --output=source / | grep -v Filesystem) # /dev/mapper/centos-root
lvdisplay $mountpoint > /dev/null
if [ $? != 0 ]; then
    echo "Error: $mountpoint does not look like a LVM logical volume. Aborting."
    exit 1
fi
echo -e "\n+++Current root partition size:+++"
df -h / | grep -v Filesystem
lvname=$(lvs --noheadings $mountpoint | awk '{print($1)}') # root
vgname=$(lvs --noheadings $mountpoint | awk '{print($2)}') # centos
lvpath="/dev/${vgname}/${lvname}" # /dev/centos/root
pvname=$(pvs | grep $vgname | tail -n1 | awk '{print($1)}') # /dev/sda2
disk=$(echo $pvname | rev | cut -c 2- | rev) # /dev/sda 
diskshort=$(echo $disk | grep -Po '[^\/]+$') # sda
partnum=$(echo $pvname | grep -Po '\d$') # 2
startsector=$(fdisk -u -l $disk | grep $pvname | awk '{print $2}') # 2099200
layout=$(parted $disk --script unit s print) # Model: VMware Virtual disk (scsi) Disk /dev/sda: 83886080s Sector size (logical/physical): 512B/512B Partition Table: msdos Disk Flags: Number Start End Size Type File system Flags 1 2048s 2099199s 2097152s primary xfs boot 2 2099200s 62914559s 60815360s primary lvm
if grep -Pq "^\s$partnum\s+.+?logical.+$" <<< "$layout"; then
    logical=1
    ext_partnum=$(parted $disk --script unit s print | grep extended | grep -Po '^\s\d\s' | tr -d ' ')
    ext_startsector=$(parted $disk --script unit s print | grep extended | awk '{print $2}' | tr -d 's')
else
    logical=0
fi
parted $disk --script unit s print | if ! grep -Pq "^\s$partnum\s+.+?[^,]+?lvm\s*$"; then
    echo -e "Error: $pvname seems to have some flags other than 'lvm' set."
    exit 1
fi
if ! (fdisk -u -l $disk | grep $disk | tail -1 | grep $pvname | grep -q "Linux LVM"); then
    echo -e "Error: $pvname is not the last LVM volume on disk $disk."
    exit 1
fi
ls /sys/class/scsi_device/*/device/rescan | while read path; do echo 1 > $path; done
ls /sys/class/scsi_host/host*/scan | while read path; do echo "- - -" > $path; done
extenddisk
```

And it works beautifully within my environment. Hopefully it'll work for yours too in case you have a similar need!
