---
title: "Download Web Folder Contents with Powershell (`wget -r` replacement)" # Title of the blog post.
date: 2022-04-19T09:18:04-05:00 # Date of post creation.
# lastmod: 2022-04-19T09:18:04-05:00 # Date when last modified
description: "Using PowerShell to retrieve the files stored in a web directory when `wget` isn't an option." # Description used for search engine.
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
series: Scripts
tags:
  - powershell
  - windows
comment: true # Disable comment if false.
---
We've been working lately to use [HashiCorp Packer](https://www.packer.io/) to standardize and automate our VM template builds, and we found a need to pull in all of the contents of a specific directory on an internal web server. This would be pretty simple for Linux systems using `wget -r`, but we needed to find another solution for our Windows builds.

A coworker and I cobbled together a quick PowerShell solution which will download the files within a specified web URL to a designated directory (without recreating the nested folder structure):
```powershell
$outputdir = 'C:\Scripts\Download\'
$url = 'https://win01.lab.bowdre.net/stuff/files/'

# enable TLS 1.2 and TLS 1.1 protocols
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12, [Net.SecurityProtocolType]::Tls11

$WebResponse = Invoke-WebRequest -Uri $url
# get the list of links, skip the first one ("[To Parent Directory]") and download the files
$WebResponse.Links | Select-Object -ExpandProperty href -Skip 1 | ForEach-Object {
    $fileName = $_.ToString().Split('/')[-1]                        # 'filename.ext'
    $filePath = Join-Path -Path $outputdir -ChildPath $fileName     # 'C:\Scripts\Download\filename.ext'
    $baseUrl = $url.split('/')                                      # ['https', '', 'win01.lab.bowdre.net', 'stuff', 'files']
    $baseUrl = $baseUrl[0,2] -join '//'                             # 'https://win01.lab.bowdre.net'
    $fileUrl  = '{0}{1}' -f $baseUrl.TrimEnd('/'), $_               # 'https://win01.lab.bowdre.net/stuff/files/filename.ext'
    Invoke-WebRequest -Uri $fileUrl -OutFile $filePath 
}
```

The latest version of this script will be found on [GitHub](https://github.com/jbowdre/misc-scripts/blob/main/PowerShell/Download-WebFolder.ps1).

